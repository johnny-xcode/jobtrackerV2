import { JOB_STATUS } from "../constants.js";

const CARD_STYLES = {
  saved: { label: "Saved", value: "text-slate-700", iconBg: "bg-slate-100", ring: "ring-slate-200" },
  applied: { label: "Applied", value: "text-blue-700", iconBg: "bg-blue-100", ring: "ring-blue-200" },
  interview: { label: "Interviews", value: "text-amber-700", iconBg: "bg-amber-100", ring: "ring-amber-200" },
  offer: { label: "Offers", value: "text-emerald-700", iconBg: "bg-emerald-100", ring: "ring-emerald-200" },
  rejected: { label: "Rejected", value: "text-rose-700", iconBg: "bg-rose-100", ring: "ring-rose-200" },
};

export default function StatsCards({ stats }) {
  const total = stats?.total || 0;
  const byStatus = stats?.byStatus || {};

  const cards = JOB_STATUS.map((s) => {
    const style = CARD_STYLES[s.value];
    return {
      ...style,
      key: s.value,
      count: byStatus[s.value] || 0,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Total</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{total}</p>
        <p className="mt-1 text-xs text-slate-400">tracked applications</p>
      </div>

      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className={`mt-1 text-3xl font-semibold ${card.value}`}>{card.count}</p>
          <div className={`mt-2 h-1 w-10 rounded-full ${card.iconBg}`} />
        </div>
      ))}
    </div>
  );
}