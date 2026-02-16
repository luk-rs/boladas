import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { ContextModel } from "../../../shared/types/context";
import { useAuth } from "../../auth/useAuth";
import { MANAGER_ROLES, MIN_TEAM_MEMBERS } from "../../team-scope/constants";
import { useTeamScopeContext } from "../../team-scope/context/TeamScopeContext";
import { listTeamRosterStatus } from "../../team-scope/services/team-scope.service";
import type {
  Convocation,
  ConvocationStatus,
  HoldIntent,
  HoldProgress,
  PlayerState,
  VoteEntry,
} from "../types";
import {
  listConvocations,
  setConvocationStatus,
  updateConvocationVote,
} from "../services/convocations.service";

type ConvocationsState = {
  convocations: Convocation[];
  loading: boolean;
  canManageByTeamId: Map<string, boolean>;
  canCreateConvocation: boolean;
  canClickCreateConvocation: boolean;
  minTeamMembers: number;
  sessionUserId: string | null;
  activeTooltipId: string | null;
  holdProgressById: Record<string, HoldProgress>;
};

type ConvocationsActions = {
  refreshConvocations: () => Promise<void>;
  setTooltip: (id: string | null) => void;
  createConvocation: () => void;
  voteChange: (id: string, state: PlayerState) => Promise<void>;
  statusChange: (id: string, status: ConvocationStatus) => Promise<void>;
  holdProgress: (id: string, intent: HoldIntent, progress: number) => void;
};

type ConvocationsModel = ContextModel<ConvocationsState, ConvocationsActions>;

const ConvocationsContext = createContext<ConvocationsModel | undefined>(undefined);

export function ConvocationsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { sessionUserId } = useAuth();
  const {
    state: { memberships },
  } = useTeamScopeContext();

  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [holdProgressById, setHoldProgressById] = useState<
    Record<string, HoldProgress>
  >({});
  const [completeTeamIds, setCompleteTeamIds] = useState<Set<string>>(new Set());

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

  const canCreateConvocation = useMemo(
    () =>
      memberships.some((membership) =>
        membership.roles.some((role) => MANAGER_ROLES.has(role)),
      ),
    [memberships],
  );

  const canClickCreateConvocation = useMemo(
    () =>
      memberships.some(
        (membership) =>
          membership.roles.some((role) => MANAGER_ROLES.has(role)) &&
          completeTeamIds.has(membership.teamId),
      ),
    [completeTeamIds, memberships],
  );

  const refreshConvocations = useCallback(async () => {
    const teamIds = memberships.map((membership) => membership.teamId);
    const teamNameById = new Map(
      memberships.map((membership) => [membership.teamId, membership.teamName]),
    );

    setLoading(true);

    const [convocationsResult, teamsResult] = await Promise.all([
      listConvocations(teamIds, teamNameById, sessionUserId),
      listTeamRosterStatus(memberships, sessionUserId),
    ]);

    if (teamsResult.error) {
      setCompleteTeamIds(new Set());
    } else {
      const completeSet = new Set<string>();
      teamsResult.data.forEach((team) => {
        if (team.memberCount >= MIN_TEAM_MEMBERS) {
          completeSet.add(team.id);
        }
      });
      setCompleteTeamIds(completeSet);
    }

    if (convocationsResult.error) {
      setConvocations([]);
      setLoading(false);
      return;
    }

    setConvocations(convocationsResult.data);
    setLoading(false);
  }, [memberships, sessionUserId]);

  useEffect(() => {
    void refreshConvocations();
  }, [refreshConvocations]);

  const holdProgress = useCallback(
    (id: string, intent: HoldIntent, progress: number) => {
      setHoldProgressById((prev) => {
        if (progress <= 0) {
          if (!prev[id]) return prev;
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: { intent, progress } };
      });
    },
    [],
  );

  const voteChange = useCallback(
    async (id: string, nextState: PlayerState) => {
      if (!sessionUserId) return;

      const nowIso = new Date().toISOString();
      setConvocations((current) =>
        current.map((convocation) =>
          convocation.id === id && convocation.status === "open"
            ? (() => {
                if (convocation.myState === nextState) {
                  return convocation;
                }

                const label =
                  convocation.ballVotes.find(
                    (vote) => vote.userId === sessionUserId,
                  )?.label ??
                  convocation.couchVotes.find(
                    (vote) => vote.userId === sessionUserId,
                  )?.label ??
                  convocation.hospitalVotes.find(
                    (vote) => vote.userId === sessionUserId,
                  )?.label ??
                  "Jogador";

                const removeUser = (votes: VoteEntry[]) =>
                  votes.filter((vote) => vote.userId !== sessionUserId);

                let ballVotes = removeUser(convocation.ballVotes);
                let couchVotes = removeUser(convocation.couchVotes);
                let hospitalVotes = removeUser(convocation.hospitalVotes);

                const nextVote = {
                  userId: sessionUserId,
                  label,
                  updatedAt: nowIso,
                };

                if (nextState === "ball") {
                  ballVotes = [...ballVotes, nextVote];
                } else if (nextState === "couch") {
                  couchVotes = [...couchVotes, nextVote];
                } else {
                  hospitalVotes = [...hospitalVotes, nextVote];
                }

                const sortByUpdated = (a: VoteEntry, b: VoteEntry) =>
                  new Date(a.updatedAt).getTime() -
                  new Date(b.updatedAt).getTime();

                ballVotes = [...ballVotes].sort(sortByUpdated);
                couchVotes = [...couchVotes].sort(sortByUpdated);
                hospitalVotes = [...hospitalVotes].sort(sortByUpdated);

                return {
                  ...convocation,
                  myState: nextState,
                  roster: {
                    ball: ballVotes.length,
                    couch: couchVotes.length,
                    hospital: hospitalVotes.length,
                  },
                  ballVotes,
                  couchVotes,
                  hospitalVotes,
                };
              })()
            : convocation,
        ),
      );

      const result = await updateConvocationVote(id, sessionUserId, nextState);
      if (result.error) {
        void refreshConvocations();
      }
    },
    [refreshConvocations, sessionUserId],
  );

  const statusChange = useCallback(
    async (id: string, nextStatus: ConvocationStatus) => {
      if (nextStatus === "accepted") {
        navigate(`/games/new/${id}`);
        return;
      }

      const result = await setConvocationStatus(id, nextStatus);
      if (result.error) {
        return;
      }

      setConvocations((current) =>
        current.map((convocation) =>
          convocation.id === id
            ? { ...convocation, status: nextStatus }
            : convocation,
        ),
      );
      void refreshConvocations();
    },
    [navigate, refreshConvocations],
  );

  const createConvocation = useCallback(() => {
    if (!canClickCreateConvocation) return;
    navigate("/convocations/new");
  }, [canClickCreateConvocation, navigate]);

  const value = useMemo<ConvocationsModel>(
    () => ({
      state: {
        convocations,
        loading,
        canManageByTeamId,
        canCreateConvocation,
        canClickCreateConvocation,
        minTeamMembers: MIN_TEAM_MEMBERS,
        sessionUserId,
        activeTooltipId,
        holdProgressById,
      },
      actions: {
        refreshConvocations,
        setTooltip: setActiveTooltipId,
        createConvocation,
        voteChange,
        statusChange,
        holdProgress,
      },
    }),
    [
      convocations,
      loading,
      canManageByTeamId,
      canCreateConvocation,
      canClickCreateConvocation,
      sessionUserId,
      activeTooltipId,
      holdProgressById,
      refreshConvocations,
      createConvocation,
      voteChange,
      statusChange,
      holdProgress,
    ],
  );

  return (
    <ConvocationsContext.Provider value={value}>
      {children}
    </ConvocationsContext.Provider>
  );
}

export function useConvocationsContext() {
  const context = useContext(ConvocationsContext);
  if (!context) {
    throw new Error(
      "useConvocationsContext tem de ser usado dentro de ConvocationsProvider.",
    );
  }
  return context;
}
