import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { useTeamScopeContext } from "../../features/team-scope/context/TeamScopeContext";
import { getInviteInfo } from "../../features/team-scope/services/team-scope.service";
import {
  AUTH_ENABLED_PROVIDERS_ENV_VAR,
  hasEnabledProviders,
  isProviderEnabled,
  type OAuthProviderId,
} from "../../features/auth/oauthProviders";
import { startJoinOAuth } from "../../features/auth/oauthFlow";
import { OAuthIconButtons } from "../../features/auth/OAuthIconButtons";
import { SurfaceTile } from "../../shared/layout/SurfaceTile";

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthed, sessionEmail } = useAuth();
  const {
    state: { error: acceptError },
    actions: { acceptInvite },
  } = useTeamScopeContext();

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
    if (!token) {
      setPageError("Convite inválido ou expirado.");
      setLoading(false);
      return;
    }

    const loadInfo = async () => {
      const result = await getInviteInfo(token);
      if (result.error) {
        setPageError(result.error);
      } else if (result.data) {
        setTeamInfo(result.data);
      } else {
        setPageError("Convite inválido ou expirado.");
      }
      setLoading(false);
    };
    void loadInfo();
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
        <SurfaceTile
          variant="strong"
          className="w-full max-w-sm rounded-2xl p-8 text-center shadow-xl"
        >
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Ops!
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">{pageError}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-2xl bg-[var(--bg-app)] py-3 font-bold text-[var(--text-primary)]"
          >
            Ir para o login
          </button>
        </SurfaceTile>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
      <SurfaceTile
        variant="strong"
        className="w-full max-w-sm rounded-2xl p-8 text-center shadow-xl shadow-black/30 animate-in zoom-in duration-300"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-4xl">
          ✉️
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Convite para equipa
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Foste convidado para entrar na equipa:
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
              {loading ? "A entrar..." : "Entrar na equipa"}
            </button>
          ) : (
            <>
              <OAuthIconButtons
                loadingProvider={loadingProvider}
                onSelectProvider={(providerId) => {
                  void handleLogin(providerId);
                }}
                ariaLabelPrefix="Entrar com"
              />
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
              Sessão iniciada como {sessionEmail}
            </p>
          )}
        </div>
      </SurfaceTile>
    </div>
  );
}
