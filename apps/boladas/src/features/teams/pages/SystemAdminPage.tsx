import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { SystemAdminTeams } from "../SystemAdminTeams";
import { Navigate } from "react-router-dom";
import { UserMenu } from "../../auth/UserMenu";

export function SystemAdminPage() {
  const { sessionUserId, isSystemAdmin } = useAuth();
  const {
    allTeams,
    pendingRequests,
    createSystemTeam,
    deleteTeam,
    approveRequest,
    denyRequest,
  } = useTeams(sessionUserId, isSystemAdmin);

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <UserMenu />
      <h2>System Administration</h2>
      <SystemAdminTeams
        allTeams={allTeams}
        pendingRequests={pendingRequests}
        onCreateTeam={createSystemTeam}
        onDeleteTeam={deleteTeam}
        onApproveRequest={approveRequest}
        onDenyRequest={denyRequest}
      />
    </>
  );
}
