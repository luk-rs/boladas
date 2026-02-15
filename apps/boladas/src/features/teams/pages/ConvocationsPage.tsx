import { ConvocationsSection } from "../dashboard/components/ConvocationsSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
    </div>
  );
}
