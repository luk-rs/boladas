import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type RandomPayload = {
  value: number;
  timestamp: string;
};
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function App() {
  const [random, setRandom] = useState<RandomPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const pollingUrl = useMemo(() => `${apiUrl.replace(/\/$/, "")}/random`, []);
  const isAuthed = Boolean(sessionEmail);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();
    const media = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkInstalled();
    media.addEventListener?.("change", handleChange);
    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      media.removeEventListener?.("change", handleChange);
      window.removeEventListener("appinstalled", checkInstalled);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);
  useEffect(() => {
    if (!isInstalled || !isAuthed) {
      setRandom(null);
      setError(null);
      return;
    }

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
  }, [pollingUrl, isInstalled, isAuthed]);

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

  const signInWithProvider = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };
  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setCanInstall(false);
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Boladas</h1>
        <p>React PWA + Workers API + Supabase Auth</p>
      </header>

      {!isInstalled && (
        <section className="card install">
          <h2>Install</h2>
          <p className="muted">Install the app to continue.</p>
          {canInstall && installPrompt ? (
            <button onClick={handleInstall}>Install app</button>
          ) : (
            <div className="install-guide">
              <img
                src="/assets/install/install-guide.svg"
                alt="Install guidance"
                className="install-image"
              />
              <p className="muted">
                Use your browser menu to add this app to your home screen.
              </p>
            </div>
          )}
        </section>
      )}

      {isInstalled && !isAuthed && (
        <section className="card auth">
          <h2>Sign in</h2>
          {!supabase && (
            <p className="error">Supabase not configured. Set env vars.</p>
          )}
          {supabase && (
            <>
              <p className="muted">Sign in with</p>
              <div className="providers-grid">
                <button className="provider-button" onClick={signInWithProvider}>
                  <img src="/assets/providers/google.svg" alt="Google" />
                  <span>Google</span>
                </button>
                <button className="provider-button disabled" disabled>
                  <img src="/assets/providers/facebook.svg" alt="Meta" />
                  <span>Meta</span>
                </button>
                <button className="provider-button disabled" disabled>
                  <img src="/assets/providers/microsoft.svg" alt="Microsoft" />
                  <span>Microsoft</span>
                </button>
                <button className="provider-button disabled" disabled>
                  <img src="/assets/providers/apple.svg" alt="Apple" />
                  <span>Apple</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {isInstalled && isAuthed && (
        <section className="card">
          <div className="row">
            <h2>API random</h2>
            <button onClick={signOut}>Sign out</button>
          </div>
          <p className="muted">Signed in as {sessionEmail}</p>
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
      )}
    </div>
  );
}
