import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { SystemAdminTeams } from "../SystemAdminTeams";
import { Navigate } from "react-router-dom";

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
