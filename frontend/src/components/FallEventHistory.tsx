import { useFallEvents, type FallEvent } from "../hooks/useFallEvents";

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
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function StatusBadge({ status }: { status: FallEvent["status"] }) {
  if (status === "resolved")
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Acknowledged</span>;
  if (status === "expired")
    return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">Timed out</span>;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      Active
    </span>
  );
}

export default function FallEventHistory({ boardId }: { boardId: string }) {
  const { events, loading, error } = useFallEvents(boardId);

  const total = events.length;
  const today = events.filter(e => isToday(e.detectedAt)).length;
  const thisWeek = events.filter(e => isThisWeek(e.detectedAt)).length;
  const resolved = events.filter(e => e.status === "resolved");
  const expired = events.filter(e => e.status === "expired");
  const missRate = total > 0 ? Math.round((expired.length / total) * 100) : 0;
  const avgResponse = resolved.length > 0
    ? resolved.reduce((sum, e) => sum + (e.durationSecs ?? 0), 0) / resolved.length
    : null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">Fall Event History</h3>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Today", value: today },
          { label: "This week", value: thisWeek },
          { label: "Avg response", value: avgResponse !== null ? formatDuration(avgResponse) : "—" },
          { label: "Miss rate", value: total > 0 ? `${missRate}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded bg-gray-800 px-3 py-2 text-center">
            <div className="text-lg font-semibold text-gray-100">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading && <p className="text-xs text-gray-600">Loading...</p>}
      {error && <p className="text-xs text-red-400">Failed to load events</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-xs text-gray-600">No fall events recorded yet</p>
      )}
      {!loading && !error && events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Detected</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Response time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {events.map((e) => (
                <tr key={e.id} className="text-gray-400">
                  <td className="py-2 pr-4 font-mono">{formatDate(e.detectedAt)}</td>
                  <td className="py-2 pr-4"><StatusBadge status={e.status} /></td>
                  <td className="py-2">{formatDuration(e.durationSecs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
