import { useEffect } from "react";

export default function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        message ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 shadow-xl text-sm">
        <span className="text-gray-200">{message}</span>
        <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}
