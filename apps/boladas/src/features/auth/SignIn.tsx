import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { RegistrationForm } from "./RegistrationForm";

export function SignIn({
  inviteToken,
  error,
}: {
  inviteToken: string | null;
  error?: string | null;
}) {
  const [showRegistration, setShowRegistration] = useState(false);

  // Standard redirect login for normal sign-in (not creating a team)
  const signInWithGoogle = async () => {
    if (!supabase) return;
    const redirectTo = inviteToken
      ? `${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}`
      : window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  if (showRegistration) {
    return <RegistrationForm onCancel={() => setShowRegistration(false)} />;
  }

  return (
    <section className="card auth">
      <h2>{inviteToken ? "Accept invite" : "Sign in"}</h2>
      {!supabase && (
        <p className="error">Supabase not configured. Set env vars.</p>
      )}
      {supabase && (
        <>
          <p className="muted">
            {inviteToken
              ? "Sign in to accept your invite."
              : "Sign in with Google."}
          </p>

          <div
            className="providers-grid"
            style={{ gridTemplateColumns: "1fr" }}
          >
            <button
              className="provider-button"
              onClick={signInWithGoogle}
              style={{ justifyContent: "center" }}
            >
              <img src="/assets/providers/google.svg" alt="Google" />
              <span>Google</span>
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          {!inviteToken && (
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <p className="muted">Need a new team?</p>
              <button onClick={() => setShowRegistration(true)}>
                Create Team
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
