import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            FD
          </div>
          <h1 className="text-xl font-semibold text-white">
            Fall Detection Dashboard
          </h1>
        </Link>
        <span className="text-sm text-gray-500">Monitoring System</span>
      </div>
    </header>
  );
}
