import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PublicRoute } from "./components/layout/PublicRoute";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { DashboardPage } from "./features/teams/pages/DashboardPage";
import { SystemAdminPage } from "./features/teams/pages/SystemAdminPage";
import { TeamShell } from "./components/layout/TeamShell";
import { GamesPage } from "./features/teams/pages/GamesPage";
import { StandingsPage } from "./features/teams/pages/StandingsPage";
import { StatsPage } from "./features/teams/pages/StatsPage";
import { ActivityPage } from "./features/teams/pages/ActivityPage";
import { ProfilePage } from "./features/teams/pages/ProfilePage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin" element={<SystemAdminPage />} />

        {/* Team App Shell */}
        <Route path="/t/:teamId" element={<TeamShell />}>
          <Route index element={<Navigate to="games" replace />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="standings" element={<StandingsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
