import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function RegistrationForm({ onCancel }: { onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    seasonStart: "",
    holidayStart: "",
  });
  const [status, setStatus] = useState<
    "idle" | "authenticating" | "registering" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  // Monitor for successful login during "authenticating" state
  useEffect(() => {
    if (status !== "authenticating" || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If we signed in successfully, we just wait.
      // useAuth will handle the registration (via localStorage) and eventually set isAuthed=true.
      // When isAuthed=true in App.tsx, this component will be unmounted.
      if (event === "SIGNED_IN" && session) {
        setStatus("registering");
      }
    });

    return () => subscription.unsubscribe();
  }, [status]);

  const handleGoogleSignIn = async () => {
    if (!formData.name || !formData.seasonStart || !formData.holidayStart) {
      setError("All fields are required.");
      return;
    }
    if (!supabase) return;

    setError(null);
    setStatus("authenticating");

    // Check if running in PWA standalone mode
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    // Always save registration data to localStorage to persist across OAuth/Redirect
    // This allows useAuth to pick it up and complete the registration.
    localStorage.setItem("boladas:registration_data", JSON.stringify(formData));

    // Get the auth URL (redirection to our popup callback)
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: !isStandalone, // Use popup for browser, redirect for PWA
        redirectTo: isStandalone
          ? window.location.origin
          : `${window.location.origin}?popup=true`,
      },
    });

    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }

    // If Popup mode (data.url exists if skipBrowserRedirect is true)
    if (!isStandalone && data?.url) {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.url,
        "google-auth",
        `width=${width},height=${height},top=${top},left=${left},popup=yes`,
      );
    }
  };

  if (status === "authenticating") {
    return (
      <section className="card auth" style={{ textAlign: "center" }}>
        <h2>Authenticating...</h2>
        <div className="spinner" style={{ margin: "2rem auto" }}></div>
        <p>Please complete sign-in in the popup window.</p>
        <button onClick={() => setStatus("idle")} style={{ marginTop: "1rem" }}>
          Cancel
        </button>
      </section>
    );
  }

  if (status === "registering") {
    return (
      <section className="card auth" style={{ textAlign: "center" }}>
        <h2>Creating Team...</h2>
        <div className="spinner" style={{ margin: "2rem auto" }}></div>
        <p>Setting up your workspace.</p>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="card auth" style={{ textAlign: "center" }}>
        <h2>Success!</h2>
        <p>Team created successfully.</p>
      </section>
    );
  }

  return (
    <section className="card auth">
      <h2>Create and Register Team</h2>
      <div className="stack">
        <div className="row">
          <label>Team Name</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Dream Team"
          />
        </div>
        <div className="row">
          <label>Season Start</label>
          <input
            type="date"
            value={formData.seasonStart}
            onChange={(e) =>
              setFormData({ ...formData, seasonStart: e.target.value })
            }
          />
        </div>
        <div className="row">
          <div className="stack" style={{ gap: "0.2rem" }}>
            <label>Holiday Start</label>
            <small className="muted" style={{ fontSize: "0.8em" }}>
              End deferred from next season start
            </small>
          </div>
          <input
            type="date"
            value={formData.holidayStart}
            onChange={(e) =>
              setFormData({ ...formData, holidayStart: e.target.value })
            }
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="muted" style={{ textAlign: "center", marginTop: "1rem" }}>
        Sign up with:
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          className="provider-button"
          onClick={handleGoogleSignIn}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <img src="/assets/providers/google.svg" alt="Google" />
          <span>Google</span>
        </button>
      </div>

      <button
        onClick={onCancel}
        style={{
          marginTop: "1rem",
          background: "transparent",
          border: "1px solid currentColor",
          width: "100%",
        }}
      >
        Cancel
      </button>
    </section>
  );
}
