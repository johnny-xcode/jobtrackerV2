import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext.jsx";
import {
  getJobs,
  getStats,
  createJob,
  updateJob,
  deleteJob,
  extractJob,
} from "./api/client.js";
import { JOB_STATUS } from "./constants.js";
import AddJobBar from "./components/AddJobBar.jsx";
import StatsCards from "./components/StatsCards.jsx";
import JobsTable from "./components/JobsTable.jsx";
import JobModal from "./components/JobModal.jsx";
import { SearchIcon, BriefcaseIcon } from "./components/Icons.jsx";

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const { user, logout } = useAuth();

  const notify = (message, type = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const refresh = useCallback(async () => {
    const [jobData, statsData] = await Promise.all([getJobs(), getStats()]);
    setJobs(jobData);
    setStats(statsData);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } catch {
        notify("Could not reach the API. Is the backend running?", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await getJobs({ q: search, status: statusFilter });
        setJobs(data);
      } catch {
        /* ignore transient errors while typing */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleExtract = async (link) => {
    setExtracting(true);
    try {
      const data = await extractJob(link);
      setModal({
        mode: "add",
        initial: {
          ...data,
          link,
          status: "applied",
          datePosted: data.datePosted || new Date().toISOString().slice(0, 10),
        },
      });
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    } finally {
      setExtracting(false);
    }
  };

  const handleManual = () => setModal({ mode: "add", initial: null });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "edit") {
        await updateJob(modal.job._id, form);
        notify("Job updated.");
      } else {
        await createJob(form);
        notify("Job added to your tracker.");
      }
      setModal(null);
      await refresh();
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (job, status) => {
    setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, status } : j)));
    try {
      const updated = await updateJob(job._id, { status });
      setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
      setStats((prev) => {
        const byStatus = { ...prev.byStatus };
        byStatus[job.status] = Math.max(0, (byStatus[job.status] || 0) - 1);
        byStatus[status] = (byStatus[status] || 0) + 1;
        return { total: prev.total, byStatus };
      });
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
      await refresh();
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"?`)) return;
    try {
      await deleteJob(job._id);
      notify("Job deleted.");
      await refresh();
    } catch (error) {
      notify(error.response?.data?.message || error.message, "error");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BriefcaseIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">JobLens</h1>
              <p className="text-xs text-slate-500">{user?.name ? `Welcome, ${user.name}` : "Job application tracker"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {notice && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              notice.type === "error"
                ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
            }`}
          >
            {notice.message}
          </div>
        )}

        <StatsCards stats={stats} />

        <AddJobBar onExtract={handleExtract} onManual={handleManual} loading={extracting} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <SearchIcon />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, tags..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={!statusFilter} onClick={() => setStatusFilter("")}>
              All
            </FilterChip>
            {JOB_STATUS.map((s) => (
              <FilterChip
                key={s.value}
                active={statusFilter === s.value}
                onClick={() => setStatusFilter(statusFilter === s.value ? "" : s.value)}
              >
                {s.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
              Loading jobs...
            </div>
          </div>
        ) : (
          <JobsTable
            jobs={jobs}
            onEdit={(job) => setModal({ mode: "edit", job, initial: job })}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      <JobModal
        open={modal !== null}
        initial={modal?.initial || null}
        saving={saving}
        title={modal?.mode === "edit" ? "Edit job" : "Add job"}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}