import { useEffect, useState } from "react";
import { JOB_STATUS } from "../constants.js";
import { XIcon, SparkleIcon } from "./Icons.jsx";

const EMPLOYMENT_TYPES = [
  "",
  "Full-Time",
  "Part-Time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
];

const emptyForm = {
  title: "",
  company: "",
  location: "",
  salary: "",
  employmentType: "",
  status: "applied",
  datePosted: "",
  link: "",
  notes: "",
  tags: "",
  description: "",
};

function toForm(job) {
  return {
    title: job.title || "",
    company: job.company || "",
    location: job.location || "",
    salary: job.salary || "",
    employmentType: job.employmentType || "",
    status: job.status || "applied",
    datePosted: job.datePosted
      ? new Date(job.datePosted).toISOString().slice(0, 10)
      : "",
    link: job.link || "",
    notes: job.notes || "",
    tags: Array.isArray(job.tags) ? job.tags.join(", ") : job.tags || "",
    description: job.description || "",
  };
}

export default function JobModal({ open, initial, saving, title, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial ? toForm(initial) : emptyForm);
      setError("");
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    onSave({
      ...form,
      title: form.title.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      datePosted: form.datePosted || today,
    });
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  const labelClass = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {initial?.link && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-indigo-600">
                <SparkleIcon className="h-3 w-3" />
                Extracted from the job link
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Job title *</label>
              <input className={inputClass} value={form.title} onChange={set("title")} placeholder="e.g. Senior React Developer" />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} value={form.company} onChange={set("company")} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input className={inputClass} value={form.location} onChange={set("location")} placeholder="e.g. Remote, Berlin" />
            </div>
            <div>
              <label className={labelClass}>Salary</label>
              <input className={inputClass} value={form.salary} onChange={set("salary")} placeholder="e.g. $80k - $100k" />
            </div>
            <div>
              <label className={labelClass}>Employment type</label>
              <select className={inputClass} value={form.employmentType} onChange={set("employmentType")}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t || "any"} value={t}>
                    {t || "Not specified"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={set("status")}>
                {JOB_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date posted</label>
              <input type="date" className={inputClass} value={form.datePosted} onChange={set("datePosted")} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Link</label>
              <input className={inputClass} value={form.link} onChange={set("link")} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tags (comma separated)</label>
              <input className={inputClass} value={form.tags} onChange={set("tags")} placeholder="react, remote, startup" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea className={inputClass} rows={2} value={form.notes} onChange={set("notes")} placeholder="Recruiter contact, follow-up dates, etc." />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea className={inputClass} rows={3} value={form.description} onChange={set("description")} placeholder="Job description / key requirements" />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}