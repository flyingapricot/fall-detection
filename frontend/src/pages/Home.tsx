import BoardCard from "../components/BoardCard";
import { useBoards } from "../hooks/useBoards";

export default function Home() {
  const { boards, loading, error } = useBoards();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Connected Boards</h2>
        <p className="mt-1 text-sm text-gray-400">
          {loading
            ? "Loading..."
            : `${boards.length} board${boards.length !== 1 ? "s" : ""} connected`}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          Unable to reach server: {error}
        </div>
      )}

      {!loading && boards.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
          <div className="mb-3 text-4xl text-gray-700">&#x1f4e1;</div>
          <p className="text-gray-400">No boards connected</p>
          <p className="mt-1 text-sm text-gray-600">
            Boards will appear here when they connect to the TCP server
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <BoardCard key={board.ID} board={board} />
        ))}
      </div>
    </main>
  );
}
