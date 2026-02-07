import { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";

import { useAuth } from "./features/auth/useAuth";
import { usePendingRegistration } from "./features/auth/usePendingRegistration";
import { useTeams } from "./features/teams/useTeams";
import { AppRoutes } from "./AppRoutes";

export default function App() {
  const { isAuthed } = useAuth();
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
          Authentication successful. Closing...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
      <GlobalInviteHandler />
      <GlobalRegistrationHandler />
    </BrowserRouter>
  );
}

function GlobalRegistrationHandler() {
  usePendingRegistration();
  return null;
}

function GlobalInviteHandler() {
  const { isAuthed } = useAuth();
  const { acceptInvite } = useTeams();

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
