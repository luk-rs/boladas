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
import type { UpcomingGame } from "../types";
import {
  cancelGameFromConvocation,
  listGames,
} from "../services/games.service";

type GamesState = {
  games: UpcomingGame[];
  loading: boolean;
  cancellingGameId: string | null;
  canManageByTeamId: Map<string, boolean>;
};

type GamesActions = {
  refreshGames: () => Promise<void>;
  cancelGame: (game: UpcomingGame) => Promise<void>;
};

type GamesModel = ContextModel<GamesState, GamesActions>;

const GamesContext = createContext<GamesModel | undefined>(undefined);

export function GamesProvider({ children }: { children: ReactNode }) {
  const {
    state: { memberships },
  } = useTeamScopeContext();
  const { sessionUserId } = useAuth();
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);

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
    const teamIds = memberships.map((membership) => membership.teamId);
    const teamNameById = new Map(
      memberships.map((membership) => [membership.teamId, membership.teamName]),
    );

    setLoading(true);
    const result = await listGames(teamIds, teamNameById, sessionUserId);
    if (result.error) {
      setGames([]);
      setLoading(false);
      return;
    }

    setGames(result.data);
    setLoading(false);
  }, [memberships, sessionUserId]);

  useEffect(() => {
    void refreshGames();
  }, [refreshGames]);

  const cancelGame = useCallback(
    async (game: UpcomingGame) => {
      if (!game.convocationId) return;

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

  const value = useMemo<GamesModel>(
    () => ({
      state: {
        games,
        loading,
        cancellingGameId,
        canManageByTeamId,
      },
      actions: {
        refreshGames,
        cancelGame,
      },
    }),
    [games, loading, cancellingGameId, canManageByTeamId, refreshGames, cancelGame],
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
