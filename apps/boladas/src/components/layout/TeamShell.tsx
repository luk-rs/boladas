import { Outlet, useParams } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useTeams } from "../../features/teams/useTeams";
import { useAuth } from "../../features/auth/useAuth";

export function TeamShell() {
  const { teamId } = useParams<{ teamId: string }>();
  const { sessionUserId, isSystemAdmin } = useAuth();

  // Fetch team details (simplified for now, ideally use a specific single-team hook)
  const { memberships } = useTeams(sessionUserId, isSystemAdmin);
  const activeTeam = memberships.find((m) => m.teamId === teamId);

  // If loading or not found, we might want to handle it.
  // For now, assuming it renders content or loading state.

  // Determine title based on route logic or just show Team Name
  const title = activeTeam?.teamName ?? "Team";

  // We need to inject styles for the bottom nav layout
  return (
    <div className="team-shell">
      <TopBar title={title} showBack />
      <main className="content">
        <Outlet context={{ activeTeam }} />
      </main>
      <BottomNav />
      {/* Styles for this layout */}
      <style>{`
        .team-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #f5f5f5;
        }
        .top-bar {
          background: #fff;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 10;
        }
        .top-bar h1 {
          font-size: 1.2rem;
          margin: 0;
          flex: 1;
        }
        .back-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          padding-bottom: 80px; /* Space for bottom nav */
        }
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          display: flex;
          justify-content: space-around;
          padding: 0.5rem;
          border-top: 1px solid #ddd;
          box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
        }
        .nav-item {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: #666;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .nav-item.active {
          color: #007bff;
        }
        .nav-item .icon {
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
}
