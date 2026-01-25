import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../features/auth/useAuth";
import { useTeams } from "../../features/teams/useTeams";

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthed, sessionUserId } = useAuth();
  const { acceptInvite, error: acceptError } = useTeams(sessionUserId, false);

  const [teamInfo, setTeamInfo] = useState<{
    team_name: string;
    team_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !supabase) return;
    const loadInfo = async () => {
      // Use direct client for public call
      if (!supabase) return;
      const { data, error } = await supabase.rpc("get_invite_info", {
        p_token: token,
      });
      if (error) {
        setError(error.message); // Likely 'expired' or 'invalid' handled poorly by empty return, assuming RPC works
      } else if (data && data.length > 0) {
        setTeamInfo(data[0]);
      } else {
        setError("Convite inválido ou expirado.");
      }
      setLoading(false);
    };
    loadInfo();
  }, [token]);

  const handleJoin = async () => {
    if (isAuthed && token) {
      setLoading(true);
      const teamId = await acceptInvite(token);
      if (teamId) {
        navigate("/profile");
      } else {
        setLoading(false); // Error is handled by hook
      }
    } else {
      // Login Flow
      localStorage.setItem("boladas:invite_redirect", window.location.href);
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      // Persist that we are accepting an invite?
      // Actually, if we redirect back to THIS url, we just land here again but now isAuthed=true.
      if (!supabase) return;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: !isStandalone,
          redirectTo: window.location.href, // Return to this page
        },
      });
      if (error) setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-6">
        <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-8 text-center shadow-mui">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Ops!
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
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
          <button
            onClick={handleJoin}
            className="w-full rounded-2xl bg-primary-600 py-4 font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 active:scale-95"
          >
            {isAuthed ? "Confirmar e Entrar" : "Entrar com Google"}
          </button>

          {acceptError && (
            <p className="text-xs text-red-500 font-bold">{acceptError}</p>
          )}

          {isAuthed && (
            <p className="text-xs text-[var(--text-secondary)]">
              Logado como {useAuth().sessionEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
