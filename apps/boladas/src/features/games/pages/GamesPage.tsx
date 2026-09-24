import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { useAuth } from "../../auth/useAuth";
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
    state: {
      games,
      loading,
      loadError,
      canManageByTeamId,
      cancellingGameId,
      recordingGameId,
    },
    actions: { cancelGame, recordResult },
  } = useGamesContext();
  const { sessionUserId } = useAuth();

  return (
    <PageScaffold title="Jogos" className="space-y-4">
      <GamesSection
        games={games}
        loading={loading}
        loadError={loadError}
        canManageByTeamId={canManageByTeamId}
        cancellingGameId={cancellingGameId}
        recordingGameId={recordingGameId}
        sessionUserId={sessionUserId}
        onCancelGame={(game) => {
          void cancelGame(game);
        }}
        onRecordResult={recordResult}
      />
    </PageScaffold>
  );
}
