import { useState, useEffect } from "react";
import type { Board } from "../types/board";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const POLL_INTERVAL = 5000;

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchBoards() {
      try {
        const res = await fetch(`${API_URL}/boards/connected`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Board[] | null = await res.json();
        if (active) {
          setBoards(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to fetch boards");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchBoards();
    const interval = setInterval(fetchBoards, POLL_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { boards, loading, error };
}
