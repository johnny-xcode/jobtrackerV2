import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 JobLensBot/1.0";

const GENERIC_STOP_WORDS = [
  "www",
  "jobs",
  "careers",
  "career",
  "boards",
  "board",
  "join",
  "apply",
  "talent",
  "recruit",
  "recruiting",
  "hiring",
  "work",
  "staffing",
];

const TLD_WORDS = [
  "com",
  "org",
  "net",
  "io",
  "co",
  "ai",
  "dev",
  "tech",
  "job",
  "jobs",
  "uk",
  "ca",
  "au",
  "de",
  "fr",
  "nz",
  "in",
  "eu",
  "info",
  "biz",
];

const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Full Time",
  "Part-Time",
  "Part Time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
  "Volunteer",
];

const TITLE_SUFFIX_PATTERN =
  /\s*[|•-]\s*(LinkedIn|Job Application|Careers|Workday|Job Offer|Vacancy|Apply)\s*$/i;

export function normalizeUrl(input) {
  let url = String(input || "").trim();
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !/^https?:\/\//i.test(url)) {
    return null;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function toCompanyName(hostname) {
  const parts = hostname
    .replace(/^www\./, "")
    .replace(/^job[s]?\./, "")
    .replace(/^career[s]?\./, "")
    .split(".")
    .filter((p) => p && !GENERIC_STOP_WORDS.includes(p) && !TLD_WORDS.includes(p));

  const name = parts.find((p) => /^[a-z]{2,}$/i.test(p)) || parts[0];
  if (!name) return hostname.replace(/^www\./, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function parseJsonLd($) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      nodes.push(JSON.parse(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          nodes.push(JSON.parse(match[0]));
        } catch {
          /* skip malformed */
        }
      }
    }
  });
  return nodes;
}

function unwrap(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = unwrap(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.some((t) => String(t).toLowerCase() === "jobposting")) return node;
    if (node["@graph"]) {
      const found = unwrap(node["@graph"]);
      if (found) return found;
    }
    for (const key of ["itemListElement", "mainEntity", "items"]) {
      if (node[key]) {
        const found = unwrap(node[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

function metaContent($, names) {
  for (const name of names) {
    const value =
      $(`meta[property="${name}"]`).attr("content") ||
      $(`meta[name="${name}"]`).attr("content") ||
      $(`meta[itemprop="${name}"]`).attr("content");
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function pickText($, selectors) {
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().replace(/\s+/g, " ").trim();
      if (text) return text;
    }
  }
  return null;
}

function cleanField(value) {
  if (!value) return "";
  return String(value).replace(/[\n\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function decodeEntities(value) {
  if (!value) return "";
  let s = String(value);
  const replacements = [
    [/&lt;/g, "<"],
    [/&gt;/g, ">"],
    [/&quot;|&#34;/g, '"'],
    [/&apos;|&#39;/g, "'"],
    [/&#x2F;|&#47;/g, "/"],
    [/&amp;/g, "&"],
  ];
  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function splitTitleAndCompany(title) {
  const atIndex = title.toLowerCase().lastIndexOf(" at ");
  if (atIndex > 0) {
    const before = title.slice(0, atIndex).trim();
    const after = title.slice(atIndex + 4).trim();
    return { title: before, company: after };
  }
  return { title, company: null };
}

function cleanTitle(title) {
  return cleanField(title)
    .replace(TITLE_SUFFIX_PATTERN, "")
    .replace(/\s+-\s+.*$/i, "")
    .trim();
}

function normalizeEmploymentType(value) {
  if (!value) return "";
  const raw = Array.isArray(value) ? value.join(", ") : String(value);
  const collapsed = raw.replace(/[_\s]/g, "-").toLowerCase();
  for (const type of EMPLOYMENT_TYPES) {
    if (collapsed.includes(type.toLowerCase().replace(/[\s-]/g, "-"))) return type;
  }
  return cleanField(raw);
}

function getSalary($) {
  const text = $("body").text().replace(/\s+/g, " ").slice(0, 6000);
  const patterns = [
    /\$[\d][\d,]*k?(?:\s*[-–—to]+\s*\$?[\d][\d,]*k?)?\s*(?:\/|per\s*)?(?:year|yr|annum|annually|month|mo|hour|hr|week|wk)/i,
    /\$[\d][\d,]*k?\s*[-–—to]+\s*\$?[\d][\d,]*k?/i,
    /\$[\d][\d,]*k?\s*\+(?:\s*\/\s*(?:year|yr|hour|hr))?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return cleanField(match[0]);
  }
  return "";
}

function describeRemote(jsonLdRaw, html) {
  if (/telecommute|remote/i.test(jsonLdRaw || "http")) {
    return html && /remote/i.test(html) ? "Remote" : null;
  }
  return null;
}

export function extractMainText($) {
  const body = $("body").clone();
  body.find("script, style, noscript, svg, template, iframe").remove();
  return body.text().replace(/[\n\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function parseHtml(html, url) {
  const $ = cheerio.load(html);

  const jsonLdNodes = parseJsonLd($);
  let job = null;
  let jsonLdRaw = "";
  for (const node of jsonLdNodes) {
    job = unwrap(node);
    if (job) {
      jsonLdRaw = JSON.stringify(job).toLowerCase();
      break;
    }
  }

  const hostname = new URL(url).hostname;
  const ogSiteName = metaContent($, ["og:site_name"]);
  let company = null;
  let title =
    cleanTitle(
      (job && (job.title || job.name)) ||
        metaContent($, ["og:title", "twitter:title"]) ||
        pickText($, ["title"])
    ) || "";

  if (job && job.hiringOrganization && typeof job.hiringOrganization === "object") {
    company = job.hiringOrganization.name;
  }
  if (!company) company = ogSiteName;
  if (title && !company) {
    const split = splitTitleAndCompany(title);
    title = split.title;
    company = split.company || null;
  }
  if (!company) company = toCompanyName(hostname);
  company = cleanField(company).replace(TITLE_SUFFIX_PATTERN, "").trim();

  let salary = cleanField(
    job && job.baseSalary
      ? typeof job.baseSalary === "object"
        ? job.baseSalary.value &&
          (typeof job.baseSalary.value === "object"
            ? job.baseSalary.value.value
            : job.baseSalary.value)
        : job.baseSalary
      : ""
  );
  if (salary && /^\d{4,}$/.test(salary)) {
    salary = `$${Number(salary).toLocaleString("en-US")}`;
  }
  if (!salary) salary = getSalary($);

  let location = "";
  if (job && job.jobLocation) {
    const jll = job.jobLocation;
    const locs = Array.isArray(jll) ? jll : [jll];
    for (const loc of locs) {
      const jt = (loc.jobLocationType || "").toLowerCase();
      if (/telecommute|remote/i.test(jt)) {
        location = "Remote";
        break;
      }
      if (loc.address && typeof loc.address === "object") {
        const parts = [
          loc.address.addressLocality,
          loc.address.addressRegion,
          loc.address.postalCode,
          loc.address.addressCountry && loc.address.addressCountry.name,
        ].filter(Boolean);
        location = parts.join(", ");
        break;
      }
    }
  }
  if (!location && /remote/i.test(jsonLdRaw)) location = "Remote";
  if (!location) {
    const remoteHint = describeRemote(jsonLdRaw);
    if (remoteHint) location = remoteHint;
  }

  const datePosted = job && job.datePosted ? new Date(job.datePosted) : null;

  const employmentType = normalizeEmploymentType(job && job.employmentType);

  const description =
    cleanField(
      (job && (job.description || job.overview)) ||
        metaContent($, ["og:description", "twitter:description", "description"])
    ).slice(0, 1000) || "";

  const directApply =
    (job && (job.directApply === true || job.directApply === "true")) || undefined;

  return {
    link: url,
    source: hostname,
    title: title || "Untitled job",
    company,
    location,
    salary,
    employmentType,
    datePosted: datePosted && !isNaN(datePosted.getTime()) ? datePosted.toISOString() : null,
    description,
    directApply,
    extracted: !!(jsonLdNodes.length || ogSiteName || title),
  };
}

const AI_PROVIDERS = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    jsonMode: true,
    label: "OpenAI (gpt-4o-mini, paid)",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.1-8b-instant",
    envKey: "GROQ_API_KEY",
    jsonMode: true,
    label: "Groq (free tier)",
  },
  ollama: {
    baseUrlEnv: "OLLAMA_BASE_URL",
    baseUrlDefault: "http://localhost:11434/v1",
    modelEnv: "OLLAMA_MODEL",
    modelDefault: "llama3.2",
    envKey: null,
    jsonMode: false,
    label: "Ollama (local, free)",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    modelEnv: "OPENROUTER_MODEL",
    modelDefault: "meta-llama/llama-3.1-8b-instant",
    envKey: "OPENROUTER_API_KEY",
    jsonMode: true,
    label: "OpenRouter (free models)",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelEnv: "GEMINI_MODEL",
    modelDefault: "gemini-1.5-flash",
    envKey: "GEMINI_API_KEY",
    jsonMode: true,
    label: "Google Gemini (free tier)",
  },
};

function getProvider() {
  const name = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const preset = AI_PROVIDERS[name] || AI_PROVIDERS.openai;
  return {
    ...preset,
    baseUrl: preset.baseUrlEnv
      ? process.env[preset.baseUrlEnv] || preset.baseUrlDefault
      : preset.baseUrl,
    model: preset.modelEnv
      ? process.env[preset.modelEnv] || preset.modelDefault
      : preset.model,
  };
}

function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    /* try harder below */
  }
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

async function enrichWithAI(html, url, base) {
  const provider = getProvider();
  const apiKey = provider.envKey ? process.env[provider.envKey] : "";
  if (provider.envKey && !apiKey) {
    return { ...base, enriched: false, aiProvider: provider.label };
  }

  const text = extractMainText(cheerio.load(html)).slice(0, 9000);

  const prompt = `You are a job posting parser. From the following webpage content (URL: ${url}), extract structured job data. ${encodePrompt(
    base
  )}`;

  const body = {
    model: provider.model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: text },
    ],
  };
  if (provider.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return { ...base, enriched: false, aiProvider: provider.label };

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = extractJson(content);
    if (!parsed) return { ...base, enriched: false, aiProvider: provider.label };

    const merged = { ...base, enriched: true, aiProvider: provider.label };
    for (const key of [
      "title",
      "company",
      "location",
      "salary",
      "employmentType",
      "description",
    ]) {
      const value = cleanField(parsed[key]);
      if (value) merged[key] = value;
    }
    if (parsed.datePosted && isNaN(new Date(parsed.datePosted).getTime()) === false) {
      merged.datePosted = new Date(parsed.datePosted).toISOString();
    }
    merged.extracted = true;
    return merged;
  } catch {
    return { ...base, enriched: false, aiProvider: provider.label };
  }
}

function encodePrompt(base) {
  return `Return ONLY a single JSON object (no markdown, no text before or after). Use exactly these keys: ${[
    "title",
    "company",
    "location",
    "salary",
    "employmentType",
    "datePosted",
    "description",
  ].join(", ")}. Empty string for unknown values. Current best guess based on page metadata: ${JSON.stringify(
    base
  )}.`;
}

async function tryGreenhouseApi(url) {
  try {
    const u = new URL(url);
    if (!/greenhouse\.io$/.test(u.hostname)) return null;
    const segments = u.pathname.split("/").filter(Boolean);
    const id = u.searchParams.get("gh_jid") || segments[segments.length - 1];
    const tokenIndex = segments.indexOf("jobs");
    if (tokenIndex < 1 || !id) return null;
    const token = segments[tokenIndex - 1];

    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}`,
      {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const job = await res.json();
    if (!job || !job.title) return null;

    const description = cleanField(
      cheerio.load(decodeEntities(job.content || "")).text()
    ).slice(0, 1000);

    return {
      link: job.absolute_url || url,
      source: u.hostname,
      title: cleanTitle(job.title),
      company: toCompanyName(u.hostname),
      location: (job.location && job.location.name) || "",
      salary: "",
      employmentType: normalizeEmploymentType(job.employment_type || ""),
      datePosted:
        job.first_published || job.updated_at
          ? new Date(job.first_published || job.updated_at).toISOString()
          : null,
      description,
      extracted: true,
    };
  } catch {
    return null;
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36 Edg/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

const BLOCKED_HOSTS_KEYWORDS = [
  "linkedin.com",
  "indeed.com",
  "workday.com",
  "myworkdayjobs",
  "jobstreet.com",
  "seek.co.nz",
  "seek.com",
  "glassdoor.com",
];

function blockedHostHint(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (BLOCKED_HOSTS_KEYWORDS.some((k) => host.includes(k))) {
    return " This site is behind bot protection (Cloudflare/LinkedIn/Indeed-style "
      + "challenges) and cannot be scraped automatically. Paste a Greenhouse/Lever/Ashby/"
      + "company-careers link instead, or click \"Add manually\".";
  }
  return "";
}

export async function fetchJobData(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    throw new Error("Please provide a valid URL (http/https).");
  }

  let response = null;
  for (const ua of USER_AGENTS) {
    try {
      response = await fetch(normalized, {
        headers: {
          "User-Agent": ua,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      continue;
    }
    if (response.ok) break;
  }

  if (!response || !response.ok) {
    const status = response ? response.status : "network error";
    const proxiedHtml = await fetchViaScraperApi(normalized, status);
    if (proxiedHtml) {
      return processHtml(proxiedHtml, normalized);
    }
    const hint = blockedHostHint(normalized);
    throw new Error(
      `Could not fetch the page (HTTP ${status}).${hint}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("html")) {
    const proxiedHtml = await fetchViaScraperApi(normalized, 0);
    if (proxiedHtml) return processHtml(proxiedHtml, normalized);
    throw new Error("The link does not seem to point to a job posting page.");
  }

  return processHtml(await response.text(), normalized);
}

async function fetchViaScraperApi(url, status) {
  const apiKey = process.env.SCRAPERAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const target = new URL(
      process.env.SCRAPERAPI_BASE_URL || "https://api.scraperapi.com/"
    );
    target.searchParams.set("api_key", apiKey);
    target.searchParams.set("url", url);
    if (process.env.SCRAPERAPI_PREMIUM === "true") {
      target.searchParams.set("premium", "true");
    }
    const res = await fetch(target.href, {
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) {
      console.warn(`SCRAPERAPI non-ok status: ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (!contentType.toLowerCase().includes("html")) {
      if (/error|banned|quota/i.test(text)) {
        console.warn("SCRAPERAPI returned error body:", text.slice(0, 200));
        return null;
      }
      return text;
    }
    return text;
  } catch (error) {
    console.warn("SCRAPERAPI fetch failed:", error.message);
    return null;
  }
}

async function processHtml(html, normalized) {
  let data = parseHtml(html, normalized);
  if (/greenhouse\.io$/.test(new URL(normalized).hostname)) {
    const gh = await tryGreenhouseApi(normalized);
    if (gh && gh.title && gh.title !== "Opportunities") data = gh;
  }
  return enrichWithAI(html, normalized, data);
}