import { useState } from "react";
import { LinkIcon, SparkleIcon } from "./Icons.jsx";

export default function AddJobBar({ onExtract, onManual, loading }) {
  const [link, setLink] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!link.trim() || loading) return;
    onExtract(link.trim());
  };
  const manual = () => {
    onManual();
    setLink("");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <LinkIcon />
          </div>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste a job posting link, e.g. https://linkedin.com/jobs/view/..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!link.trim() || loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
                Extracting...
              </>
            ) : (
              <>
                <SparkleIcon />
                Extract job
              </>
            )}
          </button>
          <button
            type="button"
            onClick={manual}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Add manually
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        JobLens reads the posting, extracts the details with AI, and stores it in your tracker.
      </p>
    </div>
  );
}