import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { GamesSection } from "../components/GamesSection";
import { GamesProvider, useGamesContext } from "../context/GamesContext";

export function GamesPage() {
  return (
    <GamesProvider>
      <GamesPageView />
    </GamesProvider>
  );
}

function GamesPageView() {
  const {
    state: { games, loading, canManageByTeamId, cancellingGameId },
    actions: { cancelGame },
  } = useGamesContext();

  return (
    <PageScaffold title="Jogos" className="space-y-4">
      <GamesSection
        games={games}
        loading={loading}
        canManageByTeamId={canManageByTeamId}
        cancellingGameId={cancellingGameId}
        onCancelGame={(game) => {
          void cancelGame(game);
        }}
      />
    </PageScaffold>
  );
}
