import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface FallEvent {
  id: number;
  boardID: string;
  detectedAt: string;
  resolvedAt: string | null;
  status: "active" | "resolved" | "expired";
  durationSecs: number | null;
}

export function useFallEvents(boardId: string, refreshSignal?: unknown) {
  const [events, setEvents] = useState<FallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualTick, setManualTick] = useState(0);

  const refetch = useCallback(() => setManualTick(t => t + 1), []);

  useEffect(() => {
    let active = true;

    async function fetch_() {
      try {
        const res = await fetch(`${API_URL}/boards/board${boardId}/fall-events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          setEvents(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetch_();
    const interval = setInterval(fetch_, 30_000);
    return () => { active = false; clearInterval(interval); };
  // refreshSignal and manualTick both trigger an immediate refetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, refreshSignal, manualTick]);

  return { events, loading, error, refetch };
}
