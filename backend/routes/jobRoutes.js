import express from "express";
import {
  getJobs,
  getJob,
  createJob,
  extractJob,
  addJobFromLink,
  updateJob,
  deleteJob,
  getStats,
} from "../controllers/jobController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getJobs);
router.get("/stats", protect, getStats);
router.get("/:id", protect, getJob);
router.post("/", protect, createJob);
router.post("/extract", protect, extractJob);
router.post("/from-link", protect, addJobFromLink);
router.put("/:id", protect, updateJob);
router.delete("/:id", protect, deleteJob);

export default router;
