import { Link } from "react-router-dom";
import type { Board } from "../types/board";

const statusConfig = {
  online: { color: "bg-emerald-500", label: "Online" },
  alert: { color: "bg-red-500", label: "Alert" },
} as const;

function timeAgo(isoString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  board: Board;
}

export default function BoardCard({ board }: Props) {
  const status = statusConfig[board.status];

  return (
    <Link
      to={`/board/${board.id}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-white group-hover:text-indigo-400 transition-colors">
            {board.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500">Board #{board.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${status.color} ${board.status === "online" ? "animate-pulse" : ""}`}
          />
          <span className="text-xs text-gray-400">{status.label}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Last activity: {timeAgo(board.lastActivity)}
        </span>
        {board.fallDetected && (
          <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
            Fall Detected
          </span>
        )}
      </div>
    </Link>
  );
}
