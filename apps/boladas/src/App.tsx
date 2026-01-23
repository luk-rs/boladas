import { useEffect, useMemo } from "react";
import { Page, Header } from "./components/layout";
import { InstallPrompt } from "./features/install/InstallPrompt";
import { SignIn } from "./features/auth/SignIn";
import { UserMenu } from "./features/auth/UserMenu";
import { useAuth } from "./features/auth/useAuth";
import { usePWAInstall } from "./features/install/usePWAInstall";
import { useTeams } from "./features/teams/useTeams";
import { useMembers } from "./features/members/useMembers";
import { useHealth } from "./features/health/useHealth";
import { TeamSelector } from "./features/teams/TeamSelector";
import { RequestTeam } from "./features/teams/RequestTeam";
import { SystemAdminTeams } from "./features/teams/SystemAdminTeams";
import { MemberList } from "./features/members/MemberList";
import { InviteMember } from "./features/members/InviteMember";

export default function App() {
  const { isInstalled } = usePWAInstall();
  const {
    isAuthed,
    sessionUserId,
    isSystemAdmin,
    sessionEmail,
    signOut,
    error: authError,
  } = useAuth();
  const {
    memberships,
    activeTeamId,
    myRequests,
    pendingRequests,
    allTeams,
    error: teamError,
    status: teamStatus,
    requestTeam,
    createSystemTeam,
    deleteTeam,
    approveRequest,
    denyRequest,
    setActiveTeamId,
    acceptInvite,
  } = useTeams(sessionUserId, isSystemAdmin);

  const {
    members,
    invites,
    error: memberError,
    status: memberStatus,
    setBaseRole,
    toggleExtraRole,
    createInvite,
  } = useMembers(activeTeamId);

  const { status: healthStatus, error: healthError } = useHealth(isAuthed);

  // Derived state
  const activeMembership = memberships.find((m) => m.teamId === activeTeamId);
  const isTeamAdmin = activeMembership?.roles.includes("team_admin") ?? false;
  const canManageTeam = isSystemAdmin || isTeamAdmin;

  const error = authError || teamError || memberError || healthError;
  const status = teamStatus || memberStatus || healthStatus;

  // Invite Token Logic
  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  }, []);

  useEffect(() => {
    if (inviteToken && isAuthed) {
      void acceptInvite(inviteToken).then((teamId) => {
        if (teamId) {
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }
      });
    }
  }, [inviteToken, isAuthed]);

  return (
    <Page>
      <Header />
      <InstallPrompt />

      {isInstalled && !isAuthed && <SignIn inviteToken={inviteToken} />}

      {isInstalled && isAuthed && (
        <>
          <UserMenu />
          {status && <p className="muted">{status}</p>}
          {error && <p className="error">{error}</p>}

          {/* New User / No Team */}
          {memberships.length === 0 && (
            <RequestTeam onRequest={requestTeam} myRequests={myRequests} />
          )}

          {/* Team Selection */}
          {memberships.length > 0 && (
            <TeamSelector
              memberships={memberships}
              activeTeamId={activeTeamId}
              onSelect={setActiveTeamId}
            />
          )}

          {/* System Admin */}
          {isSystemAdmin && (
            <SystemAdminTeams
              allTeams={allTeams}
              pendingRequests={pendingRequests}
              onCreateTeam={createSystemTeam}
              onDeleteTeam={deleteTeam}
              onApproveRequest={approveRequest}
              onDenyRequest={denyRequest}
            />
          )}

          {/* Active Team Dashboard */}
          {activeTeamId && activeMembership && (
            <section className="card">
              <p className="muted">
                Roles: {activeMembership.roles.join(", ")}
              </p>
              <div className="row">
                <span>Base role:</span>
                <button
                  onClick={() =>
                    setBaseRole(activeMembership.teamMemberId, "member")
                  }
                  disabled={activeMembership.roles.includes("member")}
                >
                  Member
                </button>
                <button
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
                  <InviteMember
                    invites={invites}
                    onCreateInvite={createInvite}
                  />
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
      )}
    </Page>
  );
}
