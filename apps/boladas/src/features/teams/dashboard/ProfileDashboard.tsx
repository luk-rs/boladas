import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { supabase } from "../../../lib/supabase";
import { MIN_TEAM_MEMBERS, MANAGER_ROLES } from "./constants";
import {
  Convocation,
  ConvocationStatus,
  EmojiStackItem,
  HoldIntent,
  HoldProgress,
  PlayerState,
  TeamRosterStatus,
  VoteEntry,
} from "./types";
import { ConvocationsSection } from "./components/ConvocationsSection";
import { DashboardTabs, DashboardTabId } from "./components/DashboardTabs";
import { GamesSection } from "./components/GamesSection";
import { TeamsSection } from "./components/TeamsSection";

export type TeamsDashboardProps = {
  withPadding?: boolean;
  className?: string;
};

export function ProfileDashboard({
  withPadding = true,
  className = "",
}: TeamsDashboardProps) {
  const navigate = useNavigate();
  const { sessionUserId, isSystemAdmin } = useAuth();
  const { memberships, loading: membershipsLoading } = useTeams(
    sessionUserId,
    isSystemAdmin,
  );
  const [teamsWithStatus, setTeamsWithStatus] = useState<TeamRosterStatus[]>(
    [],
  );
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTabId>("games");

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

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    memberships.forEach((membership) => {
      map.set(membership.teamId, membership.teamName);
    });
    return map;
  }, [memberships]);

  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [loadingConvocations, setLoadingConvocations] = useState(false);
  const [holdProgressById, setHoldProgressById] = useState<
    Record<string, HoldProgress>
  >({});

  const normalizeStatus = (value?: string | null): ConvocationStatus => {
    if (value === "accepted" || value === "dismissed") {
      return value;
    }
    return "open";
  };

  const handleHoldProgress = useCallback(
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

  const handleVoteChange = useCallback(
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

  const handleStatusChange = useCallback(
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

  return (
    <div
      className={`space-y-4 ${withPadding ? "px-4 pb-0 pt-4" : ""} ${className}`}
    >
      <DashboardTabs value={activeTab} onChange={setActiveTab} />
      {activeTab === "games" && <GamesSection />}
      {activeTab === "convocations" && (
        <ConvocationsSection
          convocations={convocations}
          loading={loadingConvocations}
          canManageByTeamId={canManageByTeamId}
          minTeamMembers={MIN_TEAM_MEMBERS}
          sessionUserId={sessionUserId}
          activeTooltipId={activeTooltipId}
          onTooltipChange={setActiveTooltipId}
          onVoteChange={handleVoteChange}
          onStatusChange={handleStatusChange}
          holdProgressById={holdProgressById}
          onHoldProgress={handleHoldProgress}
        />
      )}
      {activeTab === "teams" && (
        <TeamsSection
          teams={teamsWithStatus}
          loading={membershipsLoading || loadingTeams}
          activeTooltipId={activeTooltipId}
          onTooltipChange={setActiveTooltipId}
        />
      )}
    </div>
  );
}
