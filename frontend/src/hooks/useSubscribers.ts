import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface Subscriber {
  chatID: number;
  firstName: string;
  username: string;
}

export function useSubscribers(boardId: string) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchSubscribers() {
      try {
        const res = await fetch(`${API_URL}/boards/board${boardId}/subscribers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          setSubscribers(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSubscribers();
    return () => { active = false; };
  }, [boardId]);

  return { subscribers, loading, error };
}
