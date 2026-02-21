import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-500/50">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
              <path d="M12 7v5l3 3" />
              <path d="M9 12H6" />
              <path d="M10 17l-2 4" />
              <path d="M14 17l2 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight group-hover:text-indigo-400 transition-colors">
              Fall Detection
            </h1>
            <p className="text-xs text-gray-500 leading-tight">Monitoring Dashboard</p>
          </div>
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">System Online</span>
        </div>
      </div>
    </header>
  );
}
