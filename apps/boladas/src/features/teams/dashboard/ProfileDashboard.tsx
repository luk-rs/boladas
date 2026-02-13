import { ConvocationsSection } from "./components/ConvocationsSection";
import { DashboardTabs } from "./components/DashboardTabs";
import { GamesSection } from "./components/GamesSection";
import { TeamsSection } from "./components/TeamsSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "./context/ProfileDashboardContext";

export type TeamsDashboardProps = {
  withPadding?: boolean;
  className?: string;
};

export function ProfileDashboard(props: TeamsDashboardProps) {
  return (
    <ProfileDashboardProvider>
      <ProfileDashboardView {...props} />
    </ProfileDashboardProvider>
  );
}

function ProfileDashboardView({
  withPadding = true,
  className = "",
}: TeamsDashboardProps) {
  const {
    activeTab,
    onTabChange,
    games,
    loadingGames,
    canManageByTeamId,
    cancellingGameId,
    onCancelGame,
    convocations,
    loadingConvocations,
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
    teamsWithStatus,
    membershipsLoading,
    loadingTeams,
  } = useProfileDashboardContext();

  return (
    <div
      className={`space-y-4 ${withPadding ? "px-4 pb-0 pt-4" : ""} ${className}`}
    >
      <DashboardTabs value={activeTab} onChange={onTabChange} />
      {activeTab === "games" && (
        <GamesSection
          games={games}
          loading={loadingGames}
          canManageByTeamId={canManageByTeamId}
          cancellingGameId={cancellingGameId}
          onCancelGame={onCancelGame}
        />
      )}
      {activeTab === "convocations" && (
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
      )}
      {activeTab === "teams" && (
        <TeamsSection
          teams={teamsWithStatus}
          loading={membershipsLoading || loadingTeams}
          activeTooltipId={activeTooltipId}
          onTooltipChange={onTooltipChange}
        />
      )}
    </div>
  );
}
