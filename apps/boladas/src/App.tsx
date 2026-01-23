import { useEffect, useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { Page, Header } from "./components/layout";
import { InstallPrompt } from "./features/install/InstallPrompt";
import { usePWAInstall } from "./features/install/usePWAInstall";
import { useAuth } from "./features/auth/useAuth";
import { useTeams } from "./features/teams/useTeams";
import { AppRoutes } from "./AppRoutes";

export default function App() {
  const { isInstalled } = usePWAInstall();
  // We need auth and teams hook at top level mainly for the global invite/popup logic
  // OR we can move that logic to a specialized component inside Router.
  // Ideally, useAuth should be used inside router context if it uses router hooks (nav),
  // but here it uses window location.

  // Checking Popup logic (Global)
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Authentication successful. Closing...</p>
      </div>
    );
  }

  // Invite acceptance logic could be moved to a hook that runs inside the Dashboard or a "AcceptInvitePage"
  // But for now, keeping it compatible, let's just let the Dashboard or Login page handle parameters if needed.
  // Actually, existing App.tsx handled invite acceptance globally.
  // Let's create a GlobalInviteHandler component.

  return (
    <BrowserRouter>
      <Page>
        <Header />
        <InstallPrompt />
        {/* Only show content if installed (based on original logic which hid everything if not installed? 
            Original logic: {isInstalled && ...}. 
            Wait, original logic allowed install prompt. 
            If PWA is NOT installed, we might want to ONLY show install prompt?
            Original: {isInstalled && !isAuthed ...}
            Actually the usePWAInstall hook logic ensures 'isInstalled' flag or similar.
            Let's assume the router handles the view, and Layout handles the prompt. 
         */}
        <AppRoutes />
        <GlobalInviteHandler />
      </Page>
    </BrowserRouter>
  );
}

function GlobalInviteHandler() {
  const { isAuthed, sessionUserId } = useAuth();
  // We need useTeams to accept invite, but useTeams needs userId.
  const { acceptInvite } = useTeams(sessionUserId, false);

  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  }, []);

  useEffect(() => {
    if (inviteToken && isAuthed) {
      void acceptInvite(inviteToken).then((teamId) => {
        if (teamId) {
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
          // Optional: Reload or navigate
          window.location.reload();
        }
      });
    }
  }, [inviteToken, isAuthed, acceptInvite]);

  return null;
}
