import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../features/auth/useAuth";
import { useTeams } from "../../features/teams/useTeams";
import {
  AUTH_ENABLED_PROVIDERS_ENV_VAR,
  OAUTH_PROVIDERS,
  hasEnabledProviders,
  isProviderEnabled,
  type OAuthProviderId,
} from "../../features/auth/oauthProviders";
import { startJoinOAuth } from "../../features/auth/oauthFlow";

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthed, sessionEmail } = useAuth();
  const { acceptInvite, error: acceptError } = useTeams();

  const [teamInfo, setTeamInfo] = useState<{
    team_name: string;
    team_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attemptedAutoJoin, setAttemptedAutoJoin] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(
    null,
  );
  const hasConfiguredProviders = hasEnabledProviders();

  useEffect(() => {
    if (!token || !supabase) {
      if (!supabase)
        setPageError("Erro de configuração: Supabase não inicializado.");
      return;
    }
    const loadInfo = async () => {
      // Use direct client for public call
      const { data, error } = await supabase!.rpc("get_invite_info", {
        p_token: token,
      });
      if (error) {
        setPageError(error.message);
      } else if (data && data.length > 0) {
        setTeamInfo(data[0]);
      } else {
        setPageError("Convite inválido ou expirado.");
      }
      setLoading(false);
    };
    loadInfo();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setLoading(true);
    const teamId = await acceptInvite(token);
    if (teamId) {
      navigate("/profile");
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthed) {
      setAttemptedAutoJoin(false);
    }
  }, [isAuthed, token]);

  // Auto-join once after authentication.
  useEffect(() => {
    if (
      isAuthed &&
      token &&
      !loading &&
      !pageError &&
      teamInfo &&
      !attemptedAutoJoin
    ) {
      setAttemptedAutoJoin(true);
      void handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, token, loading, pageError, teamInfo, attemptedAutoJoin]);

  const handleLogin = async (providerId: OAuthProviderId) => {
    if (!supabase) return;
    if (!isProviderEnabled(providerId)) {
      setAuthError("Este método de login não está disponível neste ambiente.");
      return;
    }

    setAuthError(null);
    setLoadingProvider(providerId);

    const result = await startJoinOAuth({
      provider: providerId,
    });

    if (!result.ok) {
      setAuthError(result.error);
      setLoadingProvider(null);
      return;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-6">
        <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-8 text-center shadow-mui">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Ops!
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">{pageError}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-2xl bg-[var(--bg-app)] py-3 font-bold text-[var(--text-primary)]"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-8 text-center shadow-mui animate-in zoom-in duration-300">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-4xl">
          ✉️
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Convite para Time
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Você foi convidado para entrar no time:
        </p>
        <h2 className="mt-4 text-2xl font-black text-primary-600">
          {teamInfo?.team_name}
        </h2>

        <div className="mt-8 space-y-4">
          {isAuthed ? (
            <button
              onClick={handleJoin}
              className="w-full rounded-2xl bg-primary-600 py-4 font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 active:scale-95"
            >
              {loading ? "Entrando..." : "Entrar no Time"}
            </button>
          ) : (
            <>
              {OAUTH_PROVIDERS.map((provider) => {
                const enabled = isProviderEnabled(provider.id);
                const disabled = loadingProvider !== null || !enabled;
                const isLoading = loadingProvider === provider.id;

                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      void handleLogin(provider.id);
                    }}
                    disabled={disabled}
                    className={`group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-4 font-bold text-slate-700 shadow-md ring-1 ring-slate-200 transition-all ${
                      disabled
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:bg-slate-50 hover:shadow-lg active:scale-95"
                    }`}
                  >
                    {isLoading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    ) : (
                      <img
                        src={provider.iconPath}
                        alt={provider.label}
                        className={`h-6 w-6 transition-transform ${
                          disabled ? "opacity-60" : "group-hover:scale-110"
                        }`}
                      />
                    )}
                    <span>
                      {isLoading ? "Conectando..." : `Entrar com ${provider.label}`}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {!isAuthed && !hasConfiguredProviders && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-left">
              <p className="text-xs font-semibold text-amber-700">
                Nenhum provedor OAuth está habilitado. Defina{" "}
                {AUTH_ENABLED_PROVIDERS_ENV_VAR}=google,azure,facebook.
              </p>
            </div>
          )}

          {isAuthed && acceptError && (
            <p className="text-xs text-red-500 font-bold">{acceptError}</p>
          )}

          {!isAuthed && authError && (
            <p className="text-xs text-red-500 font-bold">{authError}</p>
          )}

          {isAuthed && (
            <p className="text-xs text-[var(--text-secondary)]">
              Logado como {sessionEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
