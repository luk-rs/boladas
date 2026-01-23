import type { Provider } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const providerButtons: { id: Provider; label: string; icon: string }[] = [
  { id: "google", label: "Google", icon: "/assets/providers/google.svg" },
  { id: "facebook", label: "Meta", icon: "/assets/providers/facebook.svg" },
  { id: "azure", label: "Microsoft", icon: "/assets/providers/microsoft.svg" },
  { id: "apple", label: "Apple", icon: "/assets/providers/apple.svg" },
];

export function SignIn({ inviteToken }: { inviteToken: string | null }) {
  const signInWithProvider = async (provider: Provider) => {
    if (!supabase) return;
    const redirectTo = inviteToken
      ? `${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}`
      : window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  };

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
              : "Sign in with one of the providers below."}
          </p>
          <div className="providers-grid">
            {providerButtons.map((provider) => (
              <button
                key={provider.id}
                className="provider-button"
                onClick={() => signInWithProvider(provider.id)}
              >
                <img src={provider.icon} alt={provider.label} />
                <span>{provider.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
