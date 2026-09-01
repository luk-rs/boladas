import { useAuth } from "../../auth/useAuth";
import { SystemAdminTeams } from "../SystemAdminTeams";
import { Navigate } from "react-router-dom";
import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { useTeamManagementContext } from "../context/TeamManagementContext";

export function SystemAdminPage() {
  const { isSystemAdmin } = useAuth();
  const {
    state: { allTeams, pendingRequests },
    actions: {
      createSystemTeam,
      deleteTeam,
      approveRequest,
      denyRequest,
    },
  } = useTeamManagementContext();

  if (!isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageScaffold
      title="Administração do sistema"
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
