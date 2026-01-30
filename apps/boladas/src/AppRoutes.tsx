import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PublicRoute } from "./components/layout/PublicRoute";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { SystemAdminPage } from "./features/teams/pages/SystemAdminPage";
import { AppShell } from "./components/layout/AppShell";
import { GamesPage } from "./features/teams/pages/GamesPage";
import { StandingsPage } from "./features/teams/pages/StandingsPage";
import { StatsPage } from "./features/teams/pages/StatsPage";
import { ProfilePage } from "./features/teams/pages/ProfilePage";
import { SettingsPage } from "./features/teams/pages/SettingsPage";
import { JoinPage } from "./features/invites/JoinPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/join/:token" element={<JoinPage />} />

      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Flattened App Shell */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/standings" element={<StandingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/team-settings" element={<Navigate to="/settings" replace />} />
        </Route>

        <Route path="/admin" element={<SystemAdminPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Route>
    </Routes>
  );
}
