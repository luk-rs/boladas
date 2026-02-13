import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../auth/useAuth";
import { useTeams } from "../../useTeams";
import { MIN_TEAM_MEMBERS, MANAGER_ROLES } from "../constants";
import type { DashboardTabId } from "../components/DashboardTabs";
import type {
  Convocation,
  ConvocationStatus,
  EmojiStackItem,
  HoldIntent,
  HoldProgress,
  PlayerState,
  TeamRosterStatus,
  UpcomingGame,
  VoteEntry,
} from "../types";

type ProfileDashboardContextValue = {
  activeTab: DashboardTabId;
  onTabChange: (value: DashboardTabId) => void;
  games: UpcomingGame[];
  loadingGames: boolean;
  canManageByTeamId: Map<string, boolean>;
  cancellingGameId: string | null;
  onCancelGame: (game: UpcomingGame) => void;
  convocations: Convocation[];
  loadingConvocations: boolean;
  canCreateConvocation: boolean;
  canClickCreateConvocation: boolean;
  minTeamMembers: number;
  sessionUserId: string | null;
  activeTooltipId: string | null;
  onTooltipChange: (id: string | null) => void;
  onCreateConvocation: () => void;
  onVoteChange: (id: string, state: PlayerState) => void;
  onStatusChange: (id: string, status: ConvocationStatus) => void;
  holdProgressById: Record<string, HoldProgress>;
  onHoldProgress: (id: string, intent: HoldIntent, progress: number) => void;
  teamsWithStatus: TeamRosterStatus[];
  loadingTeams: boolean;
  membershipsLoading: boolean;
};

const ProfileDashboardContext = createContext<
  ProfileDashboardContextValue | undefined
>(undefined);

function normalizeStatus(value?: string | null): ConvocationStatus {
  if (value === "accepted" || value === "dismissed") {
    return value;
  }
  return "open";
}

export function ProfileDashboardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sessionUserId } = useAuth();
  const { memberships, loading: membershipsLoading } = useTeams();
  const [teamsWithStatus, setTeamsWithStatus] = useState<TeamRosterStatus[]>(
    [],
  );
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>("games");
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [loadingConvocations, setLoadingConvocations] = useState(false);
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [holdProgressById, setHoldProgressById] = useState<
    Record<string, HoldProgress>
  >({});

  const teamIds = useMemo(
    () => memberships.map((membership) => membership.teamId),
    [memberships],
  );

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

  const completeTeamIds = useMemo(() => {
    const set = new Set<string>();
    teamsWithStatus.forEach((team) => {
      if (team.memberCount >= MIN_TEAM_MEMBERS) {
        set.add(team.id);
      }
    });
    return set;
  }, [teamsWithStatus]);

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

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    memberships.forEach((membership) => {
      map.set(membership.teamId, membership.teamName);
    });
    return map;
  }, [memberships]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "convocations" || tabParam === "teams") {
      setActiveTab(tabParam);
      return;
    }
    setActiveTab("games");
  }, [searchParams]);

  const onTabChange = useCallback(
    (nextTab: DashboardTabId) => {
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams);
      if (nextTab === "games") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onHoldProgress = useCallback(
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

  const loadConvocations = useCallback(async () => {
    if (!supabase || teamIds.length === 0) {
      setConvocations([]);
      setLoadingConvocations(false);
      return;
    }

    setLoadingConvocations(true);

    const { data: convocationRows, error: convocationError } = await supabase
      .from("convocations")
      .select("id, team_id, title, scheduled_at, status, team:teams(name)")
      .in("team_id", teamIds)
      .order("scheduled_at", { ascending: true });

    if (convocationError || !convocationRows) {
      console.error("Failed to load convocations:", convocationError);
      setConvocations([]);
      setLoadingConvocations(false);
      return;
    }

    const convocationIds = convocationRows.map((row) => row.id);
    let voteRows: Array<{
      convocation_id: string;
      user_id: string;
      state: PlayerState;
      updated_at: string;
    }> = [];

    if (convocationIds.length > 0) {
      const { data: votes, error: votesError } = await supabase
        .from("convocation_votes")
        .select("convocation_id, user_id, state, updated_at")
        .in("convocation_id", convocationIds);

      if (votesError) {
        console.error("Failed to load convocation votes:", votesError);
      }
      voteRows = (votes ?? []) as typeof voteRows;
    }

    const userIds = Array.from(new Set(voteRows.map((vote) => vote.user_id)));
    const profileMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Failed to load profiles:", profilesError);
      } else {
        (profilesData ?? []).forEach((profile) => {
          const label = profile.display_name ?? profile.email ?? "Jogador";
          profileMap.set(profile.id, label);
        });
      }
    }

    const voteSummary = new Map<
      string,
      {
        ball: number;
        couch: number;
        hospital: number;
        myState?: PlayerState;
        ballVotes: VoteEntry[];
        couchVotes: VoteEntry[];
        hospitalVotes: VoteEntry[];
      }
    >();

    convocationIds.forEach((id) => {
      voteSummary.set(id, {
        ball: 0,
        couch: 0,
        hospital: 0,
        ballVotes: [],
        couchVotes: [],
        hospitalVotes: [],
      });
    });

    voteRows.forEach((vote) => {
      const entry = voteSummary.get(vote.convocation_id) ?? {
        ball: 0,
        couch: 0,
        hospital: 0,
        ballVotes: [],
        couchVotes: [],
        hospitalVotes: [],
      };
      const label = profileMap.get(vote.user_id) ?? "Jogador";
      const voteEntry = {
        userId: vote.user_id,
        label,
        updatedAt: vote.updated_at,
      };

      if (vote.state === "ball") {
        entry.ball += 1;
        entry.ballVotes.push(voteEntry);
      } else if (vote.state === "couch") {
        entry.couch += 1;
        entry.couchVotes.push(voteEntry);
      } else {
        entry.hospital += 1;
        entry.hospitalVotes.push(voteEntry);
      }

      if (vote.user_id === sessionUserId) {
        entry.myState = vote.state;
      }

      voteSummary.set(vote.convocation_id, entry);
    });

    const statusOrder: Record<ConvocationStatus, number> = {
      open: 0,
      accepted: 1,
      dismissed: 2,
    };

    const mapped = convocationRows
      .map((row) => {
        const teamField = row.team as { name?: string } | { name?: string }[];
        const teamName =
          (Array.isArray(teamField) ? teamField[0]?.name : teamField?.name) ??
          teamNameById.get(row.team_id) ??
          "Equipa";
        const summary = voteSummary.get(row.id) ?? {
          ball: 0,
          couch: 0,
          hospital: 0,
          ballVotes: [],
          couchVotes: [],
          hospitalVotes: [],
        };
        const ballVotes = [...summary.ballVotes].sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        );
        const couchVotes = [...summary.couchVotes].sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        );
        const hospitalVotes = [...summary.hospitalVotes].sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        );

        return {
          id: row.id,
          teamId: row.team_id,
          teamName,
          title: row.title ?? null,
          scheduledAt: row.scheduled_at,
          status: normalizeStatus(row.status),
          roster: {
            ball: ballVotes.length,
            couch: couchVotes.length,
            hospital: hospitalVotes.length,
          },
          myState: summary.myState ?? "couch",
          ballVotes,
          couchVotes,
          hospitalVotes,
        } as Convocation;
      })
      .sort((a, b) => {
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return (
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      });

    setConvocations(mapped);
    setLoadingConvocations(false);
  }, [sessionUserId, teamIds, teamNameById]);

  useEffect(() => {
    void loadConvocations();
  }, [loadConvocations]);

  const loadGames = useCallback(async () => {
    if (!supabase || teamIds.length === 0) {
      setGames([]);
      setLoadingGames(false);
      return;
    }

    setLoadingGames(true);
    const nowIso = new Date().toISOString();
    const { data: gameRows, error: gamesError } = await supabase
      .from("games")
      .select(
        "id, convocation_id, team_id, scheduled_at, created_at, shirts_lineup, coletes_lineup, team:teams(name)",
      )
      .in("team_id", teamIds)
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });

    if (gamesError || !gameRows) {
      console.error("Failed to load games:", gamesError);
      setGames([]);
      setLoadingGames(false);
      return;
    }

    const toEmojiStack = (
      lineup: unknown,
      keyPrefix: string,
    ): Array<{ id: string; label: string; isSelf: boolean }> => {
      if (!Array.isArray(lineup)) return [];

      return lineup
        .map((entry, index) => {
          const player = entry as {
            id?: string;
            name?: string;
            slot?: number;
          };
          const playerId = player.id ?? `${keyPrefix}-${index}`;
          const label = player.name ?? "Jogador";
          const slotValue = Number(player.slot);

          return {
            id: `${keyPrefix}-${playerId}`,
            label,
            isSelf: player.id === sessionUserId,
            slot: Number.isNaN(slotValue) ? index + 1 : slotValue,
          };
        })
        .sort((a, b) => a.slot - b.slot)
        .map(({ slot: _, ...item }) => item);
    };

    const mapped = gameRows.map((row) => {
      const teamField = row.team as { name?: string } | { name?: string }[];
      const teamName =
        (Array.isArray(teamField) ? teamField[0]?.name : teamField?.name) ??
        teamNameById.get(row.team_id) ??
        "Equipa";

      return {
        id: row.id,
        convocationId: row.convocation_id,
        teamId: row.team_id,
        teamName,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        shirtsLineup: toEmojiStack(row.shirts_lineup, `${row.id}-shirts`),
        coletesLineup: toEmojiStack(row.coletes_lineup, `${row.id}-coletes`),
      } as UpcomingGame;
    });

    setGames(mapped);
    setLoadingGames(false);
  }, [sessionUserId, teamIds, teamNameById]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const onVoteChange = useCallback(
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

      if (!supabase) return;

      const { error } = await supabase
        .from("convocation_votes")
        .update({ state: nextState })
        .eq("convocation_id", id)
        .eq("user_id", sessionUserId);

      if (error) {
        console.error("Failed to update convocation vote:", error);
        void loadConvocations();
      }
    },
    [loadConvocations, sessionUserId],
  );

  const onStatusChange = useCallback(
    async (id: string, nextStatus: ConvocationStatus) => {
      if (nextStatus === "accepted") {
        navigate(`/games/new/${id}`);
        return;
      }

      if (!supabase) return;

      const { error } = await supabase.rpc("set_convocation_status", {
        p_convocation_id: id,
        p_status: nextStatus,
      });

      if (error) {
        console.error("Failed to update convocation status:", error);
        return;
      }

      setConvocations((current) =>
        current.map((convocation) =>
          convocation.id === id
            ? { ...convocation, status: nextStatus }
            : convocation,
        ),
      );
      void loadConvocations();
    },
    [loadConvocations, navigate],
  );

  const onCancelGame = useCallback(
    async (game: UpcomingGame) => {
      if (!supabase || !game.convocationId) return;

      setCancellingGameId(game.id);
      const { error } = await supabase.rpc("cancel_game_from_convocation", {
        p_convocation_id: game.convocationId,
      });

      if (error) {
        console.error("Failed to cancel game:", error);
        setCancellingGameId(null);
        return;
      }

      setGames((current) =>
        current.filter((currentGame) => currentGame.id !== game.id),
      );
      setConvocations((current) =>
        current.map((convocation) =>
          convocation.id === game.convocationId
            ? { ...convocation, status: "dismissed" }
            : convocation,
        ),
      );

      await Promise.all([loadGames(), loadConvocations()]);
      setCancellingGameId(null);
    },
    [loadConvocations, loadGames],
  );

  useEffect(() => {
    if (!supabase || teamIds.length === 0) {
      setTeamsWithStatus([]);
      return;
    }

    const db = supabase;
    let isMounted = true;
    setLoadingTeams(true);

    const loadTeamMembers = async () => {
      try {
        const { data, error } = await db
          .from("team_members")
          .select(
            "team_id, user_id, created_at, profile:profiles(display_name,email)",
          )
          .in("team_id", teamIds)
          .order("created_at", { ascending: true });

        if (!isMounted) return;

        if (error || !data) {
          setTeamsWithStatus([]);
          return;
        }

        const membersByTeam = new Map<string, EmojiStackItem[]>();
        teamIds.forEach((teamId) => membersByTeam.set(teamId, []));
        data.forEach((row) => {
          const profile = row.profile as
            | { display_name?: string | null; email?: string | null }
            | { display_name?: string | null; email?: string | null }[]
            | null;
          const profileData = Array.isArray(profile) ? profile[0] : profile;
          const label =
            profileData?.display_name ?? profileData?.email ?? "Jogador";
          const teamMembers = membersByTeam.get(row.team_id) ?? [];
          teamMembers.push({
            id: `${row.team_id}-${row.user_id}`,
            label,
            isSelf: row.user_id === sessionUserId,
          });
          membersByTeam.set(row.team_id, teamMembers);
        });

        const mapped = memberships.map((membership) => ({
          id: membership.teamId,
          name: membership.teamName,
          memberCount: membersByTeam.get(membership.teamId)?.length ?? 0,
          members: membersByTeam.get(membership.teamId) ?? [],
        }));

        setTeamsWithStatus(mapped);
      } finally {
        if (isMounted) setLoadingTeams(false);
      }
    };

    void loadTeamMembers();

    return () => {
      isMounted = false;
    };
  }, [memberships, teamIds, sessionUserId]);

  const value = useMemo(
    () => ({
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
      minTeamMembers: MIN_TEAM_MEMBERS,
      sessionUserId,
      activeTooltipId,
      onTooltipChange: setActiveTooltipId,
      onCreateConvocation: () => {
        if (!canClickCreateConvocation) return;
        navigate("/convocations/new");
      },
      onVoteChange,
      onStatusChange,
      holdProgressById,
      onHoldProgress,
      teamsWithStatus,
      loadingTeams,
      membershipsLoading,
    }),
    [
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
      sessionUserId,
      activeTooltipId,
      onVoteChange,
      onStatusChange,
      holdProgressById,
      onHoldProgress,
      teamsWithStatus,
      loadingTeams,
      membershipsLoading,
      navigate,
    ],
  );

  return (
    <ProfileDashboardContext.Provider value={value}>
      {children}
    </ProfileDashboardContext.Provider>
  );
}

export function useProfileDashboardContext() {
  const context = useContext(ProfileDashboardContext);
  if (!context) {
    throw new Error(
      "useProfileDashboardContext must be used inside ProfileDashboardProvider.",
    );
  }
  return context;
}
