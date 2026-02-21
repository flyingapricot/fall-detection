import { useEffect, useState } from "react";
import BoardCard from "../components/BoardCard";
import { useBoards } from "../hooks/useBoards";

function useSecondsTick(date: Date | null): number | null {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    if (!date) return;
    function update() {
      setSecs(Math.floor((Date.now() - date!.getTime()) / 1000));
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [date]);

  return secs;
}

export default function Home() {
  const { boards, loading, refreshing, lastUpdated, error } = useBoards();
  const secsSince = useSecondsTick(lastUpdated);

  const updatedLabel =
    secsSince === null ? null :
    secsSince < 5 ? "Just now" :
    `${secsSince}s ago`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Live Monitoring
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Connected Boards
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-400">
              Real-time fall detection monitoring for all connected sensor boards. Click a board to view live sensor data and event history.
            </p>
          </div>

          {/* Board count stat */}
          {!loading && (
            <div className="hidden shrink-0 flex-col items-end sm:flex">
              <span className="text-4xl font-bold tabular-nums text-white">
                {boards.length}
              </span>
              <span className="mt-0.5 text-sm text-gray-500">
                {boards.length === 1 ? "board" : "boards"} online
              </span>
            </div>
          )}
        </div>

        {/* Refresh indicator */}
        {!loading && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-600">
            <svg
              className={`h-3 w-3 ${refreshing ? "animate-spin text-gray-400" : "text-gray-700"}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {updatedLabel && <span>Updated {updatedLabel}</span>}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
          </svg>
          Unable to reach server: {error}
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && boards.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 bg-gray-900/30 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
            <svg className="h-8 w-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-400">No boards connected</p>
          <p className="mt-1 text-sm text-gray-600">
            Boards will appear here when they connect to the TCP server
          </p>
        </div>
      )}

      {/* Board grid */}
      {!loading && boards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.ID} board={board} />
          ))}
        </div>
      )}
    </main>
  );
}
