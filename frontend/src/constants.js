export const JOB_STATUS = [
  { value: "saved", label: "Saved", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700 ring-slate-200" },
  { value: "applied", label: "Applied", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 ring-blue-200" },
  { value: "interview", label: "Interview", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-amber-200" },
  { value: "offer", label: "Offer", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "rejected", label: "Rejected", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-200" },
];

export const statusMeta = (value) =>
  JOB_STATUS.find((s) => s.value === value) || JOB_STATUS[1];

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};