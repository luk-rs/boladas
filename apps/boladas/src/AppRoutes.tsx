import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PublicRoute } from "./components/layout/PublicRoute";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { DashboardPage } from "./features/teams/pages/DashboardPage";
import { SystemAdminPage } from "./features/teams/pages/SystemAdminPage";

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
