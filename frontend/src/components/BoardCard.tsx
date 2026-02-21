import { Link } from "react-router-dom";
import type { Board } from "../types/board";

function duration(isoString: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoString).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface Props {
  board: Board;
}

export default function BoardCard({ board }: Props) {
  return (
    <Link
      to={`/board/${board.ID}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-indigo-500/50 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      {/* Board image placeholder — replace src with your board image */}
      <div className="mb-4 flex items-center justify-center rounded-lg bg-gray-800 h-32 overflow-hidden">
        <img
          src="/boards/board.png"
          alt={`Board ${board.ID}`}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Hide broken image, show fallback text
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML =
              `<span class="text-gray-600 text-sm">Board ${board.ID}</span>`;
          }}
        />
      </div>

      <div className="flex items-start justify-between">
        <h3 className="text-lg font-medium text-white group-hover:text-indigo-400 transition-colors">
          Board {board.ID}
        </h3>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">Online</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Connected {duration(board.ConnectedAt)} ago</span>
        <span>Last seen {duration(board.LastSeen)} ago</span>
      </div>
    </Link>
  );
}
