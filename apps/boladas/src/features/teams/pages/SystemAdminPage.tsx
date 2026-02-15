import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { SystemAdminTeams } from "../SystemAdminTeams";
import { Navigate } from "react-router-dom";
import { PageScaffold } from "../../../components/layout/PageScaffold";

export function SystemAdminPage() {
  const { isSystemAdmin } = useAuth();
  const {
    allTeams,
    pendingRequests,
    createSystemTeam,
    deleteTeam,
    approveRequest,
    denyRequest,
  } = useTeams();

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageScaffold
      title="System Administration"
    >
      <SystemAdminTeams
        allTeams={allTeams}
        pendingRequests={pendingRequests}
        onCreateTeam={createSystemTeam}
        onDeleteTeam={deleteTeam}
        onApproveRequest={approveRequest}
        onDenyRequest={denyRequest}
      />
    </PageScaffold>
  );
}
