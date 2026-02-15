import { ConvocationsSection } from "../dashboard/components/ConvocationsSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";
import { PageScaffold } from "../../../components/layout/PageScaffold";

export function ConvocationsPage() {
  return (
    <ProfileDashboardProvider>
      <ConvocationsPageView />
    </ProfileDashboardProvider>
  );
}

function ConvocationsPageView() {
  const {
    convocations,
    loadingConvocations,
    canManageByTeamId,
    canCreateConvocation,
    canClickCreateConvocation,
    minTeamMembers,
    sessionUserId,
    activeTooltipId,
    onTooltipChange,
    onCreateConvocation,
    onVoteChange,
    onStatusChange,
    holdProgressById,
    onHoldProgress,
  } = useProfileDashboardContext();

  return (
    <PageScaffold
      title="Convocatórias"
      className="space-y-4"
    >
      <ConvocationsSection
        convocations={convocations}
        loading={loadingConvocations}
        canManageByTeamId={canManageByTeamId}
        canCreateConvocation={canCreateConvocation}
        canClickCreateConvocation={canClickCreateConvocation}
        minTeamMembers={minTeamMembers}
        sessionUserId={sessionUserId}
        activeTooltipId={activeTooltipId}
        onTooltipChange={onTooltipChange}
        onCreateConvocation={onCreateConvocation}
        onVoteChange={onVoteChange}
        onStatusChange={onStatusChange}
        holdProgressById={holdProgressById}
        onHoldProgress={onHoldProgress}
      />
    </PageScaffold>
  );
}
