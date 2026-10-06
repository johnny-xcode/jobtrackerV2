import { JOB_STATUS, statusMeta, formatDate } from "../constants.js";
import StatusBadge from "./StatusBadge.jsx";
import { MapPinIcon, LinkIcon, PencilIcon, TrashIcon } from "./Icons.jsx";

export default function JobsTable({ jobs, onEdit, onDelete, onStatusChange }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">No jobs yet</p>
        <p className="mt-1 text-sm text-slate-400">
          Paste a job link above and let JobLens add it — or add one manually.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Position</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Salary</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Posted</th>
              <th className="px-5 py-3">Added</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {jobs.map((job) => (
              <JobRow
                key={job._id}
                job={job}
                onEdit={() => onEdit(job)}
                onDelete={() => onDelete(job)}
                onStatusChange={(status) => onStatusChange(job, status)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobRow({ job, onEdit, onDelete, onStatusChange }) {
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold uppercase text-indigo-600">
            {(job.company || job.title || "?").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{job.title || "Untitled"}</p>
            <p className="text-slate-500">
              {job.company || "Unknown company"}
              {job.source ? <span className="text-slate-400"> · {job.source}</span> : null}
            </p>
            {job.tags?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {job.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-slate-600">
        {job.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPinIcon />
            {job.location}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-slate-600">{job.salary || <span className="text-slate-300">—</span>}</td>
      <td className="px-5 py-4 text-slate-600">
        {job.employmentType || <span className="text-slate-300">—</span>}
      </td>
      <td className="px-5 py-4">
        <select
          value={job.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          {JOB_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-4 text-slate-600">{formatDate(job.datePosted)}</td>
      <td className="px-5 py-4 text-slate-500">{formatDate(job.createdAt)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              title="Open posting"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
            >
              <LinkIcon />
            </a>
          )}
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <PencilIcon />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}