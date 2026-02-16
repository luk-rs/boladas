import { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";

import { useAuth } from "./features/auth/useAuth";
import { usePendingRegistration } from "./features/auth/usePendingRegistration";
import { useTeamScopeContext } from "./features/team-scope/context/TeamScopeContext";
import { AppRoutes } from "./AppRoutes";
import { useGlobalInstalledPullToRefresh } from "./app/useGlobalInstalledPullToRefresh";

export default function App() {
  const { isAuthed } = useAuth();
  const pullToRefresh = useGlobalInstalledPullToRefresh();
  const isPopup = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("popup") === "true";
  }, []);

  useEffect(() => {
    if (isPopup && isAuthed) {
      window.close();
    }
  }, [isPopup, isAuthed]);

  if (isPopup) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-app)]">
        <p className="text-[var(--text-secondary)] animate-pulse">
          Autenticação concluída. A fechar...
        </p>
      </div>
    );
  }

  return (
    <>
      {pullToRefresh.shouldShowIndicator && (
        <div
          className="pointer-events-none fixed left-1/2 z-[70] -translate-x-1/2"
          style={{ top: "calc(env(safe-area-inset-top) + 1.35rem)" }}
        >
          <div className="flex min-w-[120px] items-center justify-center gap-2 rounded-full border border-white/25 bg-[var(--bg-surface)]/90 px-3 py-2 shadow-lg backdrop-blur-md">
            <div
              className={`h-4 w-4 rounded-full border-2 border-primary-500 ${
                pullToRefresh.isRefreshing
                  ? "animate-spin border-t-transparent"
                  : "border-t-primary-200"
              }`}
              style={
                pullToRefresh.isRefreshing
                  ? undefined
                  : { transform: `rotate(${pullToRefresh.progress * 300}deg)` }
              }
            />
            <p className="text-[11px] font-semibold text-[var(--text-primary)]">
              {pullToRefresh.isRefreshing
                ? "Atualizando..."
                : pullToRefresh.isArmed
                  ? "Solte para atualizar"
                  : "Puxe para atualizar"}
            </p>
          </div>
        </div>
      )}

      <BrowserRouter>
        <AppRoutes />
        <GlobalInviteHandler />
        <GlobalRegistrationHandler />
      </BrowserRouter>
    </>
  );
}

function GlobalRegistrationHandler() {
  usePendingRegistration();
  return null;
}

function GlobalInviteHandler() {
  const { isAuthed } = useAuth();
  const {
    actions: { acceptInvite },
  } = useTeamScopeContext();

  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  }, []);

  useEffect(() => {
    if (inviteToken && isAuthed) {
      void acceptInvite(inviteToken).then((teamId) => {
        if (teamId) {
          // Clean up URL without reloading - state will update automatically
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }
      });
    }
  }, [inviteToken, isAuthed, acceptInvite]);

  return null;
}
