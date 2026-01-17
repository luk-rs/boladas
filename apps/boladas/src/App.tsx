import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type RandomPayload = {
  value: number;
  timestamp: string;
};

const providers = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Meta" },
  { id: "azure", label: "Microsoft" },
  { id: "apple", label: "Apple" },
] as const;

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function App() {
  const [random, setRandom] = useState<RandomPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const pollingUrl = useMemo(() => `${apiUrl.replace(/\/$/, "")}/random`, []);

  useEffect(() => {
    let isMounted = true;

    const fetchRandom = async () => {
      try {
        const res = await fetch(pollingUrl);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as RandomPayload;
        if (isMounted) {
          setRandom(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError((err as Error).message);
      }
    };

    fetchRandom();
    const id = setInterval(fetchRandom, 5000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [pollingUrl]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = async (provider: "google" | "facebook" | "azure" | "apple") => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider });
  };

  const sendMagicLink = async () => {
    if (!supabase || !email) return;
    await supabase.auth.signInWithOtp({ email });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Boladas</h1>
        <p>React PWA + Workers API + Supabase Auth</p>
      </header>

      <section className="card">
        <h2>API random</h2>
        {error && <p className="error">{error}</p>}
        {random ? (
          <div className="random">
            <div className="value">{random.value}</div>
            <div className="timestamp">{random.timestamp}</div>
          </div>
        ) : (
          <p>Loading…</p>
        )}
        <p className="muted">Updates every 5 seconds.</p>
      </section>

      <section className="card">
        <h2>Auth</h2>
        {!supabase && (
          <p className="error">Supabase not configured. Set env vars.</p>
        )}
        {sessionEmail ? (
          <div className="row">
            <span>Signed in as {sessionEmail}</span>
            <button onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <>
            <div className="providers">
              {providers.map((p) => (
                <button key={p.id} onClick={() => signInWithProvider(p.id)}>
                  Continue with {p.label}
                </button>
              ))}
            </div>
            <div className="magic">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button onClick={sendMagicLink}>Send magic link</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
