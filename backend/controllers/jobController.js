import Job, { JOB_STATUS } from "../models/Job.js";
import { fetchJobData, normalizeUrl } from "../services/extractor.js";

export const getJobs = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const status = req.query.status || "";
    const filter = { user: req.user._id };

    if (status && JOB_STATUS.includes(status)) {
      filter.status = status;
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { employmentType: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const sortField = req.query.sort === "updated" ? "updatedAt" : "createdAt";
    const jobs = await Job.find(filter).sort({ [sortField]: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.user._id });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const createJob = async (req, res) => {
  try {
    const { link, tags, ...rest } = req.body;
    const job = await Job.create({
      ...rest,
      user: req.user._id,
      link: link ? normalizeUrl(link) || link : link,
      tags: Array.isArray(tags)
        ? tags
        : tags
        ? String(tags).split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      extracted: false,
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const extractJob = async (req, res) => {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ message: "A link is required." });
  }
  try {
    const data = await fetchJobData(link);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addJobFromLink = async (req, res) => {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ message: "A link is required." });
  }
  try {
    const data = await fetchJobData(link);
    delete data.enriched;
    const job = await Job.create({ ...data, user: req.user._id, extracted: true });
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.user._id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const { tags, ...rest } = req.body;
    if (rest.link) {
      rest.link = normalizeUrl(rest.link) || rest.link;
    }
    if (tags !== undefined) {
      rest.tags = Array.isArray(tags)
        ? tags
        : String(tags).split(",").map((t) => t.trim()).filter(Boolean);
    }

    Object.assign(job, rest);
    const updated = await job.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted", id: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const counts = await Job.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byStatus = {};
    let total = 0;
    for (const status of JOB_STATUS) byStatus[status] = 0;
    for (const row of counts) {
      byStatus[row._id] = row.count;
      total += row.count;
    }
    res.json({ total, byStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};