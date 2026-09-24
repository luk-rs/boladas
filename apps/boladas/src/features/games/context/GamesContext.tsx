import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ContextModel } from "../../../shared/types/context";
import { useTeamScopeContext } from "../../team-scope/context/TeamScopeContext";
import { MANAGER_ROLES } from "../../team-scope/constants";
import { useAuth } from "../../auth/useAuth";
import type { Game, GameResultScores } from "../types";
import { sortGames } from "../utils";
import {
  cancelGameFromConvocation,
  listGames,
  recordGameResult,
} from "../services/games.service";

type GamesState = {
  games: Game[];
  loading: boolean;
  loadError: string | null;
  cancellingGameId: string | null;
  recordingGameId: string | null;
  canManageByTeamId: Map<string, boolean>;
};

type GamesActions = {
  refreshGames: () => Promise<void>;
  cancelGame: (game: Game) => Promise<void>;
  recordResult: (gameId: string, scores: GameResultScores) => Promise<string | null>;
};

type GamesModel = ContextModel<GamesState, GamesActions>;

const GamesContext = createContext<GamesModel | undefined>(undefined);

export function GamesProvider({ children }: { children: ReactNode }) {
  const {
    state: { memberships },
  } = useTeamScopeContext();
  const { sessionUserId } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [recordingGameId, setRecordingGameId] = useState<string | null>(null);

  const canManageByTeamId = useMemo(() => {
    const map = new Map<string, boolean>();
    memberships.forEach((membership) => {
      map.set(
        membership.teamId,
        membership.roles.some((role) => MANAGER_ROLES.has(role)),
      );
    });
    return map;
  }, [memberships]);

  const refreshGames = useCallback(async () => {
    if (!sessionUserId) {
      setGames([]);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const result = await listGames();
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }

    setGames(result.data);
    setLoading(false);
  }, [sessionUserId]);

  useEffect(() => {
    void refreshGames();
  }, [refreshGames]);

  const cancelGame = useCallback(
    async (game: Game) => {
      if (!game.convocationId || game.status === "completed") return;

      setCancellingGameId(game.id);
      const result = await cancelGameFromConvocation(game.convocationId);
      if (result.error) {
        setCancellingGameId(null);
        return;
      }

      await refreshGames();
      setCancellingGameId(null);
    },
    [refreshGames],
  );

  const recordResult = useCallback(
    async (gameId: string, scores: GameResultScores) => {
      setRecordingGameId(gameId);
      const result = await recordGameResult(gameId, scores);
      if (result.error || !result.data) {
        setRecordingGameId(null);
        return result.error ?? "Falha ao registar resultado.";
      }

      const recorded = result.data;
      setGames((current) =>
        sortGames([
          ...current.filter((game) => game.id !== recorded.id),
          recorded,
        ]),
      );

      const refreshed = await listGames();
      if (!refreshed.error) {
        setGames(refreshed.data);
        setLoadError(null);
      }
      setRecordingGameId(null);

      return null;
    },
    [],
  );

  const value = useMemo<GamesModel>(
    () => ({
      state: {
        games,
        loading,
        loadError,
        cancellingGameId,
        recordingGameId,
        canManageByTeamId,
      },
      actions: {
        refreshGames,
        cancelGame,
        recordResult,
      },
    }),
    [
      games,
      loading,
      loadError,
      cancellingGameId,
      recordingGameId,
      canManageByTeamId,
      refreshGames,
      cancelGame,
      recordResult,
    ],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

export function useGamesContext() {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error("useGamesContext tem de ser usado dentro de GamesProvider.");
  }
  return context;
}
