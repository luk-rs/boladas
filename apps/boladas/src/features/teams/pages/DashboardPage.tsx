import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { useMembers } from "../../members/useMembers";
import { useHealth } from "../../health/useHealth";
import { TeamSelector } from "../TeamSelector";
import { RequestTeam } from "../RequestTeam";
import { InviteMember } from "../../members/InviteMember";
import { MemberList } from "../../members/MemberList";
import { UserMenu } from "../../auth/UserMenu";

export function DashboardPage() {
  const { sessionUserId, isSystemAdmin, isAuthed } = useAuth();
  const {
    memberships,
    activeTeamId,
    myRequests,
    status: teamStatus,
    error: teamError,
    requestTeam,
    setActiveTeamId,
  } = useTeams(sessionUserId, isSystemAdmin);

  const {
    members,
    invites,
    status: memberStatus,
    error: memberError,
    setBaseRole,
    toggleExtraRole,
    createInvite,
  } = useMembers(activeTeamId);

  const { status: healthStatus, error: healthError } = useHealth(isAuthed);

  // Derived state
  const activeMembership = memberships.find((m) => m.teamId === activeTeamId);
  const isTeamAdmin = activeMembership?.roles.includes("team_admin") ?? false;
  const canManageTeam = isSystemAdmin || isTeamAdmin;

  const error = teamError || memberError || healthError;
  const status = teamStatus || memberStatus || healthStatus;

  return (
    <>
      <UserMenu />
      {status && <p className="muted">{status}</p>}
      {error && <p className="error">{error}</p>}

      {/* New User / No Team */}
      {memberships.length === 0 && (
        <RequestTeam onRequest={requestTeam} myRequests={myRequests} />
      )}

      {/* Team Selection List (when no active team) */}
      {memberships.length > 0 && !activeTeamId && (
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
                onClick={() => setActiveTeamId(m.teamId)}
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

      {/* Active Team Dashboard */}
      {activeTeamId && activeMembership && (
        <section className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2>{activeMembership.teamName}</h2>
            <button
              className="provider-button"
              onClick={() => setActiveTeamId(null)}
            >
              Back to Teams
            </button>
          </div>

          <p className="muted">Roles: {activeMembership.roles.join(", ")}</p>
          <div className="row">
            <span>Base role:</span>
            <button
              className="provider-button" // Using class directly or use Button component if imported
              onClick={() =>
                setBaseRole(activeMembership.teamMemberId, "member")
              }
              disabled={activeMembership.roles.includes("member")}
            >
              Member
            </button>
            <button
              className="provider-button"
              onClick={() =>
                setBaseRole(activeMembership.teamMemberId, "player")
              }
              disabled={activeMembership.roles.includes("player")}
            >
              Player
            </button>
          </div>

          {canManageTeam && (
            <>
              <hr className="divider" />
              <h2>Team admin</h2>
              <InviteMember invites={invites} onCreateInvite={createInvite} />
              <MemberList
                members={members}
                onSetBaseRole={setBaseRole}
                onToggleExtraRole={toggleExtraRole}
                canManage={canManageTeam}
                currentUserRoles={activeMembership.roles}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
