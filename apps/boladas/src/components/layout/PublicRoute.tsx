import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";

export function PublicRoute() {
  const { isAuthed, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (isAuthed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
