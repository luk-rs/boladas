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
import { useAuth } from "../../auth/useAuth";
import {
  acceptInvite as acceptInviteService,
  listMemberships,
} from "../services/team-scope.service";
import type { TeamMembership } from "../types";

type TeamScopeState = {
  memberships: TeamMembership[];
  activeTeamId: string | null;
  loading: boolean;
  error: string | null;
};

type TeamScopeActions = {
  refreshMemberships: () => Promise<void>;
  setActiveTeamId: (teamId: string | null) => void;
  acceptInvite: (token: string) => Promise<string | null>;
};

type TeamScopeModel = ContextModel<TeamScopeState, TeamScopeActions>;

const TeamScopeContext = createContext<TeamScopeModel | undefined>(undefined);

export function TeamScopeProvider({ children }: { children: ReactNode }) {
  const { isAuthed, sessionUserId } = useAuth();
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMemberships = useCallback(async () => {
    if (!sessionUserId) {
      setMemberships([]);
      setActiveTeamIdState(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await listMemberships(sessionUserId);
    if (result.error) {
      setMemberships([]);
      setError(result.error);
      setLoading(false);
      return;
    }

    setMemberships(result.data);
    setActiveTeamIdState((current) => {
      if (current && result.data.some((membership) => membership.teamId === current)) {
        return current;
      }
      return result.data[0]?.teamId ?? null;
    });
    setError(null);
    setLoading(false);
  }, [sessionUserId]);

  useEffect(() => {
    if (!isAuthed || !sessionUserId) {
      setMemberships([]);
      setActiveTeamIdState(null);
      setError(null);
      setLoading(false);
      return;
    }

    void refreshMemberships();
  }, [isAuthed, refreshMemberships, sessionUserId]);

  const setActiveTeamId = useCallback(
    (teamId: string | null) => {
      if (!teamId) {
        setActiveTeamIdState(null);
        return;
      }

      setActiveTeamIdState((current) => {
        const exists = memberships.some((membership) => membership.teamId === teamId);
        if (!exists) {
          return current;
        }
        return teamId;
      });
    },
    [memberships],
  );

  const acceptInvite = useCallback(
    async (token: string) => {
      setError(null);
      const result = await acceptInviteService(token);
      if (result.error) {
        setError(result.error);
        return null;
      }

      if (result.data) {
        setActiveTeamIdState(result.data);
      }
      await refreshMemberships();
      return result.data;
    },
    [refreshMemberships],
  );

  const value = useMemo<TeamScopeModel>(
    () => ({
      state: {
        memberships,
        activeTeamId,
        loading,
        error,
      },
      actions: {
        refreshMemberships,
        setActiveTeamId,
        acceptInvite,
      },
    }),
    [memberships, activeTeamId, loading, error, refreshMemberships, setActiveTeamId, acceptInvite],
  );

  return <TeamScopeContext.Provider value={value}>{children}</TeamScopeContext.Provider>;
}

export function useTeamScopeContext() {
  const context = useContext(TeamScopeContext);
  if (!context) {
    throw new Error("useTeamScopeContext tem de ser usado dentro de TeamScopeProvider.");
  }
  return context;
}
