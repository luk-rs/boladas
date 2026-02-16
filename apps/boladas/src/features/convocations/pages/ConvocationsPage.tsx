import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { ConvocationsSection } from "../components/ConvocationsSection";
import {
  ConvocationsProvider,
  useConvocationsContext,
} from "../context/ConvocationsContext";

export function ConvocationsPage() {
  return (
    <ConvocationsProvider>
      <ConvocationsPageView />
    </ConvocationsProvider>
  );
}

function ConvocationsPageView() {
  const {
    state: {
      convocations,
      loading,
      canManageByTeamId,
      canCreateConvocation,
      canClickCreateConvocation,
      minTeamMembers,
      sessionUserId,
      activeTooltipId,
      holdProgressById,
    },
    actions: {
      setTooltip,
      createConvocation,
      voteChange,
      statusChange,
      holdProgress,
    },
  } = useConvocationsContext();

  return (
    <PageScaffold title="Convocatórias" className="space-y-4">
      <ConvocationsSection
        convocations={convocations}
        loading={loading}
        canManageByTeamId={canManageByTeamId}
        canCreateConvocation={canCreateConvocation}
        canClickCreateConvocation={canClickCreateConvocation}
        minTeamMembers={minTeamMembers}
        sessionUserId={sessionUserId}
        activeTooltipId={activeTooltipId}
        onTooltipChange={setTooltip}
        onCreateConvocation={createConvocation}
        onVoteChange={(id, state) => {
          void voteChange(id, state);
        }}
        onStatusChange={(id, status) => {
          void statusChange(id, status);
        }}
        holdProgressById={holdProgressById}
        onHoldProgress={holdProgress}
      />
    </PageScaffold>
  );
}
