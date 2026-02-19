import { useState } from "react";
import { useFallEvents, type FallEvent } from "../hooks/useFallEvents";

const PAGE_SIZE = 5;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString("en-US", { hour12: false });
}

function formatDuration(secs: number | null) {
  if (secs === null) return "—";
  if (secs < 60) return `${Math.round(secs)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isThisWeek(iso: string) {
  const d = new Date(iso);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function StatusBadge({ status }: { status: FallEvent["status"] }) {
  if (status === "resolved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
        <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
        Acknowledged
      </span>
    );
  if (status === "expired")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
        <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" /></svg>
        Timed out
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      Active
    </span>
  );
}

export default function FallEventHistory({ boardId }: { boardId: string }) {
  const { events, loading, error } = useFallEvents(boardId);
  const [page, setPage] = useState(0);

  const total = events.length;
  const today = events.filter(e => isToday(e.detectedAt)).length;
  const thisWeek = events.filter(e => isThisWeek(e.detectedAt)).length;
  const resolved = events.filter(e => e.status === "resolved");
  const expired = events.filter(e => e.status === "expired");
  const missRate = total > 0 ? Math.round((expired.length / total) * 100) : 0;
  const avgResponse = resolved.length > 0
    ? resolved.reduce((sum, e) => sum + (e.durationSecs ?? 0), 0) / resolved.length
    : null;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageEvents = events.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const stats = [
    { label: "Today", value: today, color: "text-gray-100" },
    { label: "This week", value: thisWeek, color: "text-gray-100" },
    { label: "Avg response", value: avgResponse !== null ? formatDuration(avgResponse) : "—", color: "text-emerald-400" },
    { label: "Miss rate", value: total > 0 ? `${missRate}%` : "—", color: missRate > 50 ? "text-red-400" : missRate > 20 ? "text-amber-400" : "text-gray-100" },
  ];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-medium text-gray-300">Fall Event History</h3>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
            {total} event{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Stats row */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-gray-800/60 px-3 py-3 text-center">
              <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
              <div className="mt-0.5 text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading && (
          <div className="flex items-center gap-2 py-4 text-xs text-gray-600">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading events...
          </div>
        )}
        {error && <p className="py-2 text-xs text-red-400">Failed to load events</p>}
        {!loading && !error && total === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <svg className="mb-2 h-8 w-8 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
            <p className="text-xs text-gray-600">No fall events recorded yet</p>
          </div>
        )}
        {!loading && !error && total > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/40 text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Detected</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Response time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {pageEvents.map((e, i) => (
                    <tr key={e.id} className="text-gray-400 transition-colors hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-gray-600">
                        {total - page * PAGE_SIZE - i}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-300">{formatDate(e.detectedAt)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={e.status} /></td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDuration(e.durationSecs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    className="rounded px-2 py-1 transition-colors hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 tabular-nums">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="rounded px-2 py-1 transition-colors hover:bg-gray-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
