import BoardCard from "../components/BoardCard";
import type { Board } from "../types/board";

const mockBoards: Board[] = [
  {
    id: 1,
    name: "Board 1 - Living Room",
    status: "online",
    lastActivity: new Date(Date.now() - 30 * 1000).toISOString(),
    fallDetected: false,
  },
  {
    id: 2,
    name: "Board 2 - Bedroom",
    status: "alert",
    lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    fallDetected: true,
  },
  {
    id: 3,
    name: "Board 3 - Kitchen",
    status: "online",
    lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    fallDetected: false,
  },
];

export default function Home() {
  const alertCount = mockBoards.filter((b) => b.status === "alert").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Connected Boards</h2>
        <p className="mt-1 text-sm text-gray-400">
          {mockBoards.length} connected
          {alertCount > 0 && (
            <span className="text-red-400"> &middot; {alertCount} alert</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockBoards.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
    </main>
  );
}
