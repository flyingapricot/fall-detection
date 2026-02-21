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

function ChipIllustration() {
  return (
    <svg viewBox="0 0 100 100" fill="none" className="h-20 w-20 text-indigo-400/25">
      {/* Body */}
      <rect x="25" y="25" width="50" height="50" rx="5" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner grid */}
      <rect x="33" y="33" width="34" height="34" rx="2" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="33" x2="50" y2="67" stroke="currentColor" strokeWidth="0.75" />
      <line x1="33" y1="50" x2="67" y2="50" stroke="currentColor" strokeWidth="0.75" />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill="currentColor" />
      {/* Pins — left */}
      <line x1="10" y1="35" x2="25" y2="35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="44" x2="25" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="56" x2="25" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="65" x2="25" y2="65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Pins — right */}
      <line x1="75" y1="35" x2="90" y2="35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="75" y1="44" x2="90" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="75" y1="56" x2="90" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="75" y1="65" x2="90" y2="65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Pins — top */}
      <line x1="35" y1="10" x2="35" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="10" x2="44" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="56" y1="10" x2="56" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65" y1="10" x2="65" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Pins — bottom */}
      <line x1="35" y1="75" x2="35" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="75" x2="44" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="56" y1="75" x2="56" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65" y1="75" x2="65" y2="90" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      to={`/board/${board.ID}`}
      className="group relative block overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-300 hover:border-indigo-500/40 hover:bg-gray-800/60 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      {/* Hover gradient top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Chip illustration */}
      <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-gray-800/50">
        <ChipIllustration />
      </div>

      {/* Board name + status */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Sensor Board</p>
          <h3 className="mt-0.5 text-lg font-semibold text-white transition-colors group-hover:text-indigo-400">
            Board {board.ID}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 ring-1 ring-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Online</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <p className="text-xs text-gray-500">Connected</p>
          <p className="mt-0.5 text-sm font-medium text-gray-300">{duration(board.ConnectedAt)} ago</p>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <p className="text-xs text-gray-500">Last seen</p>
          <p className="mt-0.5 text-sm font-medium text-gray-300">{duration(board.LastSeen)} ago</p>
        </div>
      </div>

      {/* View hint */}
      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-indigo-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        View details
        <svg className="h-3.5 w-3.5 translate-x-0 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  );
}
