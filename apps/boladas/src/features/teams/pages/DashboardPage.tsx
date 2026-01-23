import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { RequestTeam } from "../RequestTeam";
import { UserMenu } from "../../auth/UserMenu";

export function DashboardPage() {
  const navigate = useNavigate();
  const { sessionUserId, isSystemAdmin } = useAuth();

  // Only fetching Lobyy Data
  const {
    memberships,
    myRequests,
    status: teamStatus,
    error: teamError,
    requestTeam,
  } = useTeams(sessionUserId, isSystemAdmin);

  return (
    <>
      <UserMenu />
      {teamStatus && <p className="muted">{teamStatus}</p>}
      {teamError && <p className="error">{teamError}</p>}

      {/* New User / No Team */}
      {memberships.length === 0 && (
        <RequestTeam onRequest={requestTeam} myRequests={myRequests} />
      )}

      {/* Team Selection List */}
      {memberships.length > 0 && (
        <div className="team-grid">
          <h2 className="mb-4">My Teams</h2>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            }}
          >
            {memberships.map((m) => (
              <div
                key={m.teamId}
                className="card action-card"
                onClick={() => navigate(`/t/${m.teamId}`)}
                style={{
                  cursor: "pointer",
                  border: "1px solid #333",
                  padding: "1.5rem",
                }}
              >
                <h3>{m.teamName}</h3>
                <p className="muted">{m.roles.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
