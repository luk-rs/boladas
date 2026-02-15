import { useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { useInstalledPullToRefresh } from "./useInstalledPullToRefresh";

export function PublicRoute() {
  const { isAuthed, loading } = useAuth();
  const shellRef = useRef<HTMLDivElement>(null);
  const pullToRefreshHandlers = useInstalledPullToRefresh(shellRef);

  if (loading) return <div>Loading...</div>;

  if (isAuthed) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      ref={shellRef}
      onTouchStart={pullToRefreshHandlers.onTouchStart}
      onTouchMove={pullToRefreshHandlers.onTouchMove}
      onTouchEnd={pullToRefreshHandlers.onTouchEnd}
      onTouchCancel={pullToRefreshHandlers.onTouchCancel}
      className="app-shell"
    >
      <Outlet />
    </div>
  );
}
