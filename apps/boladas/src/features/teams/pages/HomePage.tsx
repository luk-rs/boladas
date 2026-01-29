import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { supabase } from "../../../lib/supabase";

const MIN_TEAM_MEMBERS = 10;
const PLAYER_EMOJIS = ["👱‍♂️", "👨‍🦰", "👨‍🦱", "👨", "👨‍🦳", "👴", "👨‍🦲", "🧔"];
const MANAGER_ROLES = new Set(["team_admin", "manager", "secretary"]);

type TeamRosterStatus = {
  id: string;
  name: string;
  memberCount: number;
};

type ConvocationStatus = "open" | "accepted" | "dismissed";

type PlayerState = "ball" | "couch" | "hospital";

type BallVote = {
  userId: string;
  updatedAt: string;
};

type HoldIntent = "accepted";

type Convocation = {
  id: string;
  teamId: string;
  teamName: string;
  title?: string | null;
  scheduledAt: string;
  status: ConvocationStatus;
  roster: {
    ball: number;
    couch: number;
    hospital: number;
  };
  myState: PlayerState;
  ballVotes: BallVote[];
};

type HoldActionButtonProps = {
  label: string;
  durationMs: number;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
};

function HoldActionButton({
  label,
  durationMs,
  onComplete,
  onProgress,
  className = "",
  disabled = false,
  title,
}: HoldActionButtonProps) {
  const startRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const pressedRef = useRef(false);

  const clearTimers = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const reset = () => {
    pressedRef.current = false;
    startRef.current = null;
    clearTimers();

    onProgress?.(0);
  };

  const tick = () => {
    if (!pressedRef.current || startRef.current === null) return;
    const elapsed = performance.now() - startRef.current;
    const nextProgress = Math.min(1, elapsed / durationMs);
    onProgress?.(nextProgress);
    if (elapsed < durationMs) {
      frameRef.current = window.requestAnimationFrame(tick);
    }
  };

  const handlePointerDown = () => {
    if (disabled) return;
    pressedRef.current = true;
    startRef.current = performance.now();

    onProgress?.(0);
    clearTimers();
    frameRef.current = window.requestAnimationFrame(tick);
    timeoutRef.current = window.setTimeout(() => {
      pressedRef.current = false;
      onProgress?.(1);
      onComplete();
      window.setTimeout(() => {
        onProgress?.(0);
      }, 250);
    }, durationMs);
  };

  const handlePointerUp = () => {
    if (!pressedRef.current) return;
    reset();
  };

  return (
    <button
      type="button"
      className={`relative overflow-hidden rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      disabled={disabled}
      title={title}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
}

export function HomePage() {
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
    Record<string, { intent: HoldIntent; progress: number }>
  >({});

  const formatSchedule = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      return { dateLabel: "--", timeLabel: "--" };
    }

    const dateLabel = new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
    }).format(date);
    const timeLabel = new Intl.DateTimeFormat("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return { dateLabel, timeLabel };
  };

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

    const voteSummary = new Map<
      string,
      {
        ball: number;
        couch: number;
        hospital: number;
        myState?: PlayerState;
        ballVotes: BallVote[];
      }
    >();

    convocationIds.forEach((id) => {
      voteSummary.set(id, { ball: 0, couch: 0, hospital: 0, ballVotes: [] });
    });

    voteRows.forEach((vote) => {
      const entry = voteSummary.get(vote.convocation_id) ?? {
        ball: 0,
        couch: 0,
        hospital: 0,
        ballVotes: [],
      };

      if (vote.state === "ball") {
        entry.ball += 1;
        entry.ballVotes.push({
          userId: vote.user_id,
          updatedAt: vote.updated_at,
        });
      } else if (vote.state === "couch") {
        entry.couch += 1;
      } else {
        entry.hospital += 1;
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
        };
        const ballVotes = [...summary.ballVotes].sort(
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
            ball: summary.ball,
            couch: summary.couch,
            hospital: summary.hospital,
          },
          myState: summary.myState ?? "couch",
          ballVotes,
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

                const roster = { ...convocation.roster };
                const prevState = convocation.myState;
                let ballVotes = convocation.ballVotes;

                if (prevState === "ball") {
                  roster.ball = Math.max(0, roster.ball - 1);
                  ballVotes = ballVotes.filter(
                    (vote) => vote.userId !== sessionUserId,
                  );
                } else if (prevState === "couch") {
                  roster.couch = Math.max(0, roster.couch - 1);
                } else {
                  roster.hospital = Math.max(0, roster.hospital - 1);
                }

                if (nextState === "ball") {
                  roster.ball += 1;
                  ballVotes = [
                    ...ballVotes,
                    { userId: sessionUserId, updatedAt: nowIso },
                  ];
                } else if (nextState === "couch") {
                  roster.couch += 1;
                } else {
                  roster.hospital += 1;
                }

                ballVotes = [...ballVotes].sort(
                  (a, b) =>
                    new Date(a.updatedAt).getTime() -
                    new Date(b.updatedAt).getTime(),
                );

                return {
                  ...convocation,
                  myState: nextState,
                  roster,
                  ballVotes,
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
    [loadConvocations],
  );

  useEffect(() => {
    if (!supabase || teamIds.length === 0) {
      setTeamsWithStatus([]);
      return;
    }

    let isMounted = true;
    setLoadingTeams(true);

    supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds)
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error || !data) {
          setTeamsWithStatus([]);
          return;
        }

        const counts = new Map<string, number>();
        teamIds.forEach((teamId) => counts.set(teamId, 0));
        data.forEach((row) => {
          const current = counts.get(row.team_id) ?? 0;
          counts.set(row.team_id, current + 1);
        });

        const mapped = memberships.map((membership) => ({
          id: membership.teamId,
          name: membership.teamName,
          memberCount: counts.get(membership.teamId) ?? 0,
        }));

        setTeamsWithStatus(mapped);
      })
      .finally(() => {
        if (isMounted) setLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [memberships, teamIds]);

  const statusLabels: Record<ConvocationStatus, string> = {
    open: "Aberta",
    accepted: "Aceite",
    dismissed: "Dispensada",
  };

  const statusStyles: Record<ConvocationStatus, string> = {
    open: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
    accepted:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    dismissed:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  };

  const responseOptions: Array<{
    id: PlayerState;
    label: string;
    icon: string;
  }> = [
    { id: "ball", label: "Bola", icon: "⚽️" },
    { id: "couch", label: "Sofá", icon: "🛋️" },
    { id: "hospital", label: "Hospital", icon: "🏥" },
  ];

  const renderEmojiStack = (items: number, keyPrefix: string) => (
    <div className="flex flex-wrap -space-x-4 text-base">
      {Array.from({ length: Math.max(items, 0) }).map((_, index) => (
        <span
          key={`${keyPrefix}-${index}`}
          className="relative flex h-7 w-7 items-center justify-center"
          style={{ zIndex: items - index }}
        >
          {PLAYER_EMOJIS[index % PLAYER_EMOJIS.length]}
        </span>
      ))}
    </div>
  );

  const renderEmojiStackFromVotes = (votes: BallVote[], keyPrefix: string) => (
    <div className="flex flex-wrap -space-x-4 text-base">
      {votes.map((vote, index) => (
        <span
          key={`${keyPrefix}-${vote.userId}`}
          className="relative flex h-7 w-7 items-center justify-center"
          style={{ zIndex: votes.length - index }}
        >
          {PLAYER_EMOJIS[index % PLAYER_EMOJIS.length]}
        </span>
      ))}
    </div>
  );

  const renderRoster = (
    count: number,
    keyPrefix: string,
    isDimmed: boolean,
    icon: string,
  ) => (
    <div className={`flex items-center gap-3 ${isDimmed ? "opacity-50" : ""}`}>
      <span className="text-lg">{icon}</span>
      {count === 0 ? (
        <span className="text-xs text-[var(--text-secondary)]">
          Sem jogadores
        </span>
      ) : (
        renderEmojiStack(count, keyPrefix)
      )}
    </div>
  );

  const renderBallRoster = (
    votes: BallVote[],
    keyPrefix: string,
    isDimmed: boolean,
  ) => {
    const sortedVotes = [...votes].sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
    const starters = sortedVotes.slice(0, MIN_TEAM_MEMBERS);
    const substitutes = sortedVotes.slice(MIN_TEAM_MEMBERS);
    const starterWidth = `calc(${MIN_TEAM_MEMBERS} * 1.75rem - ${
      MIN_TEAM_MEMBERS - 1
    } * 1rem)`;

    return (
      <div
        className={`flex items-center gap-3 ${isDimmed ? "opacity-50" : ""}`}
      >
        <span className="text-lg">⚽️</span>
        {sortedVotes.length === 0 ? (
          <span className="text-xs text-[var(--text-secondary)]">
            Sem jogadores
          </span>
        ) : (
          <div className="flex items-center">
            <div className="flex items-center" style={{ width: starterWidth }}>
              {renderEmojiStackFromVotes(starters, `${keyPrefix}-t`)}
            </div>
            <div className="mx-2 h-6 w-px bg-white/50 shadow-[0_0_6px_rgba(255,255,255,0.35)] dark:bg-white/30" />
            <div className="flex items-center">
              {substitutes.length > 0 &&
                renderEmojiStackFromVotes(substitutes, `${keyPrefix}-s`)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 px-4 pb-0 pt-4">
      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Jogos
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Jogos em que estou inscrito
            </h2>
          </div>
          <span className="text-2xl">🏟️</span>
        </header>
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
          <div className="h-16 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Convocatórias
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Convocatórias em aberto para mim
            </h2>
          </div>
          <span className="text-2xl">📣</span>
        </header>
        <div className="mt-4 space-y-4">
          {loadingConvocations ? (
            <>
              <div className="h-44 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
              <div className="h-44 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
            </>
          ) : convocations.length > 0 ? (
            convocations.map((convocation) => {
              const canManage =
                canManageByTeamId.get(convocation.teamId) ?? false;
              const isOpen = convocation.status === "open";
              const { dateLabel, timeLabel } = formatSchedule(
                convocation.scheduledAt,
              );
              const canReopen =
                convocation.status === "dismissed" &&
                new Date(convocation.scheduledAt).getTime() > Date.now();
              const canAccept = convocation.roster.ball >= MIN_TEAM_MEMBERS;
              const holdState = holdProgressById[convocation.id];
              const holdTint =
                holdState?.intent === "accepted"
                  ? "bg-emerald-50/80 dark:bg-emerald-900/20"
                  : "";
              const displayTitle = convocation.teamName;

              return (
                <div
                  key={convocation.id}
                  className={`relative overflow-hidden rounded-xl px-4 py-4 ${
                    convocation.status === "dismissed"
                      ? "bg-rose-50/80 dark:bg-rose-900/20"
                      : convocation.status === "accepted"
                        ? "bg-emerald-50/80 dark:bg-emerald-900/20"
                        : "bg-[var(--bg-app)]"
                  }`}
                >
                  {holdState && (
                    <div
                      className={`pointer-events-none absolute inset-0 ${holdTint}`}
                      style={{
                        transform: `scaleX(${holdState.progress})`,
                        transformOrigin: "left",
                        transition:
                          holdState.progress === 0
                            ? "none"
                            : "transform 80ms linear",
                      }}
                    />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                          {displayTitle}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            📅 {dateLabel}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            🕘 {timeLabel}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusStyles[convocation.status]}`}
                      >
                        {statusLabels[convocation.status]}
                      </span>
                    </div>

                    <div
                      className={`mt-4 flex flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-2 ${
                        isOpen ? "" : "opacity-50"
                      }`}
                    >
                      {responseOptions.map((option) => {
                        const isActive = convocation.myState === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${
                              isActive
                                ? "bg-primary-600 text-white"
                                : "bg-transparent text-[var(--text-primary)]"
                            }`}
                            aria-pressed={isActive}
                            aria-label={option.label}
                            title={option.label}
                            disabled={!isOpen || !sessionUserId}
                            onClick={() =>
                              handleVoteChange(convocation.id, option.id)
                            }
                          >
                            <span className="text-base">{option.icon}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-3">
                      {renderBallRoster(
                        convocation.ballVotes,
                        `${convocation.id}-b`,
                        convocation.myState !== "ball",
                      )}
                      {renderRoster(
                        convocation.roster.couch,
                        `${convocation.id}-c`,
                        convocation.myState !== "couch",
                        "🛋️",
                      )}
                      {renderRoster(
                        convocation.roster.hospital,
                        `${convocation.id}-h`,
                        convocation.myState !== "hospital",
                        "🏥",
                      )}
                    </div>

                    {isOpen && canManage && (
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(convocation.id, "dismissed")
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                          title="Dispensar"
                        >
                          💤
                        </button>
                        {canAccept ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(convocation.id, "accepted")
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95"
                            title="Aceitar"
                          >
                            📝
                          </button>
                        ) : (
                          <HoldActionButton
                            label="📝"
                            durationMs={3000}
                            onComplete={() =>
                              handleStatusChange(convocation.id, "accepted")
                            }
                            onProgress={(progress) =>
                              handleHoldProgress(
                                convocation.id,
                                "accepted",
                                progress,
                              )
                            }
                            className="h-9 w-9 rounded-full bg-emerald-500 text-base text-white"
                            title={`Segure 3s para aceitar com menos de ${MIN_TEAM_MEMBERS} jogadores`}
                          />
                        )}
                      </div>
                    )}

                    {canManage && canReopen && (
                      <div className="mt-4 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(convocation.id, "open")
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-base text-[var(--text-primary)] transition-all active:scale-95"
                          title="Reabrir"
                        >
                          🥅
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-4 text-center text-sm text-[var(--text-secondary)]">
              Nenhuma convocatória encontrada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Equipas
            </p>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Equipas e respetivo plantel
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Mínimo de 10 jogadores
            </p>
          </div>
          <span className="text-2xl">🧩</span>
        </header>
        <div className="mt-4 space-y-3">
          {membershipsLoading || loadingTeams ? (
            <>
              <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
              <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
            </>
          ) : teamsWithStatus.length > 0 ? (
            teamsWithStatus.map((team) => {
              const displayCount = team.memberCount;
              const playerNames = Array.from({ length: displayCount }).map(
                (_, nameIndex) => `Jogador ${nameIndex + 1}`,
              );

              return (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-app)] px-4 py-3"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {team.name}
                    </p>
                    <div className="flex flex-wrap -space-x-4 text-base">
                      {Array.from({
                        length: Math.max(displayCount, 0),
                      }).map((_, emojiIndex) => {
                        const name = playerNames[emojiIndex] ?? "Jogador";
                        const tooltipId = `${team.id}-${emojiIndex}`;
                        const isActive = activeTooltipId === tooltipId;

                        return (
                          <button
                            key={emojiIndex}
                            type="button"
                            title={name}
                            aria-label={name}
                            className="group relative flex h-7 w-7 items-center justify-center text-left"
                            style={{ zIndex: displayCount - emojiIndex }}
                            onClick={() =>
                              setActiveTooltipId(isActive ? null : tooltipId)
                            }
                            onBlur={() => setActiveTooltipId(null)}
                            onMouseLeave={() => setActiveTooltipId(null)}
                          >
                            {PLAYER_EMOJIS[emojiIndex % PLAYER_EMOJIS.length]}
                            <span
                              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                              style={{ opacity: isActive ? 1 : undefined }}
                            >
                              {name}
                            </span>
                          </button>
                        );
                      })}
                      {team.memberCount === 0 && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          Sem jogadores
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      team.memberCount >= MIN_TEAM_MEMBERS
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    }`}
                  >
                    {team.memberCount >= MIN_TEAM_MEMBERS
                      ? "Completa"
                      : "Incompleta"}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-4 text-center text-sm text-[var(--text-secondary)]">
              Nenhuma equipa encontrada.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
