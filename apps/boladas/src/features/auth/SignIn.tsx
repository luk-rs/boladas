import { useEffect, useMemo, useState } from "react";
import { RegistrationForm } from "./RegistrationForm";
import {
  AUTH_ENABLED_PROVIDERS_ENV_VAR,
  hasEnabledProviders,
  isProviderEnabled,
  type OAuthProviderId,
} from "./oauthProviders";
import { startLoginOAuth } from "./oauthFlow";
import { OAuthIconButtons } from "./OAuthIconButtons";
import { isAuthClientConfigured, signInWithPassword } from "./services/auth.service";
import {
  REGISTRATION_ERROR_KEY,
  REGISTRATION_LOCK_KEY,
} from "./registrationStorage";
import { SurfaceTile } from "../../shared/layout/SurfaceTile";

export function SignIn({
  inviteToken,
  error,
}: {
  inviteToken: string | null;
  error?: string | null;
}) {
  const [showRegistration, setShowRegistration] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("register") === "1";
  });
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(
    null,
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState("gestor@boladas.pt");
  const [devPassword, setDevPassword] = useState("boladas123");
  const [devLoading, setDevLoading] = useState(false);
  const hasConfiguredProviders = hasEnabledProviders();
  const hasAuthClient = isAuthClientConfigured();

  const providerConfigError = useMemo(() => {
    if (hasConfiguredProviders) return null;
    return `Nenhum provedor OAuth está habilitado. Defina ${AUTH_ENABLED_PROVIDERS_ENV_VAR}=google,azure,facebook.`;
  }, [hasConfiguredProviders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(REGISTRATION_ERROR_KEY);
    if (!stored) return;

    setRegistrationError(stored);
    setShowRegistration(true);
    localStorage.removeItem(REGISTRATION_ERROR_KEY);
  }, []);

  // Standard redirect login for normal sign-in (not creating a team)
  const signInWithProvider = async (providerId: OAuthProviderId) => {
    if (!hasAuthClient) return;
    if (!isProviderEnabled(providerId)) {
      setAuthError("Este método de login não está disponível neste ambiente.");
      return;
    }

    try {
      setLoadingProvider(providerId);
      setAuthError(null);

      const result = await startLoginOAuth({
        provider: providerId,
        inviteToken,
      });

      if (!result.ok) throw new Error(result.error);
    } catch (err) {
      console.error("Erro de login:", err);
      setAuthError(
        err instanceof Error ? err.message : "Erro ao iniciar login OAuth",
      );
      setLoadingProvider(null);
    }
  };

  const handleDevLogin = async (emailToUse?: string, passwordToUse?: string) => {
    const e = emailToUse ?? devEmail;
    const p = passwordToUse ?? devPassword;
    try {
      setDevLoading(true);
      setAuthError(null);
      const res = await signInWithPassword({ email: e, password: p });
      if (res.error) {
        setAuthError(res.error);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Erro no login de desenvolvimento");
    } finally {
      setDevLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    setShowRegistration(false);
    setRegistrationError(null);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("register");
    window.history.replaceState({}, "", url.toString());
  };

  if (showRegistration) {
    return (
      <RegistrationForm
        initialError={registrationError}
        onCancel={handleCancelRegistration}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-400/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in duration-500">
        <div className="mb-8 text-center italic">
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">
            BOLADAS
          </h1>
          <p className="mt-2 text-primary-200 font-medium tracking-wide uppercase text-xs">
            Dá vida à tua jogatana
          </p>
        </div>

        <SurfaceTile
          variant="strong"
          className="rounded-2xl p-8 text-center space-y-6 shadow-xl shadow-black/30 backdrop-blur-sm"
        >
          <header>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {inviteToken ? "Aceitar convite" : "Entrar na aplicação"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              {inviteToken
                ? "Liga a tua conta para entrares no grupo e começares a jogar."
                : "Acede à tua conta para gerires os teus grupos, jogos e estatísticas."}
            </p>
          </header>

          {!hasAuthClient ? (
            <SurfaceTile
              variant="danger"
              className="border-red-200 p-4 text-center text-sm text-red-600"
            >
              <p className="text-sm text-red-600 font-medium">
                ⚠️ Erro de Configuração: Supabase não identificado.
              </p>
            </SurfaceTile>
          ) : (
            <div className="space-y-4 pt-2">
              <OAuthIconButtons
                loadingProvider={loadingProvider}
                onSelectProvider={(providerId) => {
                  void signInWithProvider(providerId);
                }}
                ariaLabelPrefix="Continuar com"
              />

              {providerConfigError && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-left">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">
                    {providerConfigError}
                  </p>
                </div>
              )}

              {(error || authError) && (
                <p className="text-sm font-medium text-red-500 text-center">
                  {error || authError}
                </p>
              )}

              {import.meta.env.DEV && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-500">
                      🛠️ Dev Quick Login
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Seed users</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={devLoading}
                      onClick={() => void handleDevLogin("gestor@boladas.pt", "boladas123")}
                      className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-2 py-1.5 text-center text-xs font-semibold text-primary-600 dark:text-primary-300 transition-all hover:bg-primary-500/20 active:scale-95 disabled:opacity-50"
                      title="Entrar como Tiago Gestor (Admin & Manager)"
                    >
                      👑 Gestor
                    </button>
                    <button
                      type="button"
                      disabled={devLoading}
                      onClick={() => void handleDevLogin("admin@boladas.pt", "boladas123")}
                      className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1.5 text-center text-xs font-semibold text-purple-600 dark:text-purple-300 transition-all hover:bg-purple-500/20 active:scale-95 disabled:opacity-50"
                      title="Entrar como Administrador de Sistema"
                    >
                      🛡️ Admin
                    </button>
                    <button
                      type="button"
                      disabled={devLoading}
                      onClick={() => void handleDevLogin("jogador@boladas.pt", "boladas123")}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                      title="Entrar como Bernardo Jogador"
                    >
                      ⚽ Jogador
                    </button>
                  </div>

                  <form
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      void handleDevLogin();
                    }}
                    className="space-y-2 pt-1"
                  >
                    <input
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="email@boladas.pt"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-app)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <input
                      type="password"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="password"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-app)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="submit"
                      disabled={devLoading}
                      className="w-full rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-50"
                    >
                      {devLoading ? "A autenticar..." : "Entrar com Credenciais"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </SurfaceTile>

        {!inviteToken && (
          <div className="mt-8 text-center animate-in slide-in-from-bottom-4 duration-700 delay-300">
            <p className="text-primary-100/70 text-sm mb-4 font-medium">
              Ainda não tens uma equipa?
            </p>
            <button
              onClick={() => {
                setRegistrationError(null);
                localStorage.removeItem(REGISTRATION_LOCK_KEY);
                setShowRegistration(true);
              }}
              className="px-8 py-3 rounded-xl bg-white/10 text-white font-bold backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-95"
            >
              Criar novo grupo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
