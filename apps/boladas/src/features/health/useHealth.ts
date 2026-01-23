import { useEffect, useState, useMemo } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";

export function useHealth(isAuthed: boolean) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingUrl = useMemo(() => `${apiUrl.replace(/\/$/, "")}/random`, []);

  useEffect(() => {
    if (!isAuthed) return;

    let isMounted = true;
    const fetchRandom = async () => {
      try {
        const res = await fetch(pollingUrl);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as { value: number; timestamp: string };
        if (isMounted) {
          setStatus(`API ok: ${data.value} at ${data.timestamp}`);
        }
      } catch (err) {
        if (isMounted) setError((err as Error).message);
      }
    };

    void fetchRandom();
    return () => {
      isMounted = false;
    };
  }, [pollingUrl, isAuthed]);

  return { status, error };
}
