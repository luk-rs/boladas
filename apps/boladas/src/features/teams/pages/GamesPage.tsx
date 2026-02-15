import { GamesSection } from "../dashboard/components/GamesSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";

export function GamesPage() {
  return (
    <ProfileDashboardProvider>
      <GamesPageView />
    </ProfileDashboardProvider>
  );
}

function GamesPageView() {
  const {
    games,
    loadingGames,
    canManageByTeamId,
    cancellingGameId,
    onCancelGame,
  } = useProfileDashboardContext();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <GamesSection
        games={games}
        loading={loadingGames}
        canManageByTeamId={canManageByTeamId}
        cancellingGameId={cancellingGameId}
        onCancelGame={onCancelGame}
      />
    </div>
  );
}
