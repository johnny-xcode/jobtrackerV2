import mongoose from "mongoose";

const JOB_STATUS = ["saved", "applied", "interview", "offer", "rejected"];

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    link: { type: String, trim: true },
    title: { type: String, trim: true, required: true },
    company: { type: String, trim: true },
    location: { type: String, trim: true },
    salary: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    datePosted: { type: Date },
    description: { type: String, trim: true },
    status: { type: String, enum: JOB_STATUS, default: "applied" },
    notes: { type: String, trim: true },
    tags: { type: [String], default: [] },
    source: { type: String, trim: true },
    extracted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", location: "text" });
jobSchema.index({ user: 1, createdAt: -1 });

const Job = mongoose.model("Job", jobSchema);

export default Job;
export { JOB_STATUS };