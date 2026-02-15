import { useSubscribers } from "../hooks/useSubscribers";

const BOT_URL = "https://t.me/FallDetection_CG2028_Bot";

export default function SubscriberList({ boardId }: { boardId: string }) {
  const { subscribers, loading, error } = useSubscribers(boardId);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Subscribers
          {!loading && !error && (
            <span className="ml-1.5 text-xs text-gray-500">({subscribers.length})</span>
          )}
        </h3>
        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Telegram Bot &rarr;
        </a>
      </div>

      {loading && <p className="text-xs text-gray-600">Loading...</p>}

      {error && <p className="text-xs text-red-400">Failed to load subscribers</p>}

      {!loading && !error && subscribers.length === 0 && (
        <p className="text-xs text-gray-600">No subscribers yet</p>
      )}

      {!loading && !error && subscribers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {subscribers.map((sub) => (
            <div
              key={sub.chatID}
              className="flex items-center gap-2 rounded bg-gray-800 px-3 py-1.5"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-400">
                {sub.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs">
                <span className="text-gray-300">{sub.firstName}</span>
                {sub.username && (
                  <span className="ml-1.5 text-gray-500">@{sub.username}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded bg-gray-800/50 px-3 py-2 text-xs text-gray-500">
        To get fall alerts, open the{" "}
        <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
          Telegram bot
        </a>{" "}
        and send:
        <div className="mt-1 font-mono text-gray-400">
          /subscribe board{boardId}
        </div>
        <div className="mt-0.5 font-mono text-gray-400">
          /unsubscribe board{boardId}
        </div>
      </div>
    </div>
  );
}
