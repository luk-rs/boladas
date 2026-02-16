import type { ReactNode } from "react";
import { AuthProvider } from "../../features/auth/useAuth";
import { PreferencesProvider } from "../../features/preferences/usePreferences";
import { TeamScopeProvider } from "../../features/team-scope/context/TeamScopeContext";
import { TeamManagementProvider } from "../../features/teams/context/TeamManagementContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TeamScopeProvider>
        <TeamManagementProvider>
          <PreferencesProvider>{children}</PreferencesProvider>
        </TeamManagementProvider>
      </TeamScopeProvider>
    </AuthProvider>
  );
}
