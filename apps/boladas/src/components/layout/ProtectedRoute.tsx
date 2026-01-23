import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { usePWAInstall } from "../../features/install/usePWAInstall";

export function ProtectedRoute() {
  const { isAuthed, loading: authLoading } = useAuth();
  const { isInstalled } = usePWAInstall();
  const location = useLocation();

  if (authLoading) {
    return <div>Loading...</div>; // Or a proper spinner
  }

  // PWA check (optional, depending on if we want to force install for protected routes too)
  // For now, assuming PWA check is global or handled in App structure.
  // But strictly speaking, if we want to enforce PWA, check here.

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
