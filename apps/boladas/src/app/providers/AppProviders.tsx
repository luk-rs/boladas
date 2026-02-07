import type { ReactNode } from "react";
import { AuthProvider } from "../../features/auth/useAuth";
import { PWAInstallProvider } from "../../features/install/usePWAInstall";
import { PreferencesProvider } from "../../features/preferences/usePreferences";
import { TeamsProvider } from "../../features/teams/useTeams";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TeamsProvider>
        <PreferencesProvider>
          <PWAInstallProvider>{children}</PWAInstallProvider>
        </PreferencesProvider>
      </TeamsProvider>
    </AuthProvider>
  );
}
