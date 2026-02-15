import { GamesSection } from "../dashboard/components/GamesSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";
import { PageScaffold } from "../../../components/layout/PageScaffold";

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
    <PageScaffold
      title="Jogos"
      className="space-y-4"
    >
      <GamesSection
        games={games}
        loading={loadingGames}
        canManageByTeamId={canManageByTeamId}
        cancellingGameId={cancellingGameId}
        onCancelGame={onCancelGame}
      />
    </PageScaffold>
  );
}
