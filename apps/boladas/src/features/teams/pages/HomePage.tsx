import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { supabase } from "../../../lib/supabase";

const MIN_TEAM_MEMBERS = 10;
const PLAYER_EMOJIS = [
  "👱‍♂️",
  "👨‍🦰",
  "👨‍🦱",
  "👨",
  "👨‍🦳",
  "👴",
  "👨‍🦲",
  "🧔",
];
const MANAGER_ROLES = new Set(["team_admin", "manager", "secretary"]);

type TeamRosterStatus = {
  id: string;
  name: string;
  memberCount: number;
};

type ConvocationStatus = "open" | "accepted" | "dismissed";

type PlayerState = "ball" | "couch" | "hospital";

type Convocation = {
  id: string;
  teamId: string;
  teamName: string;
  date: string;
  time: string;
  status: ConvocationStatus;
  roster: {
    ball: number;
    couch: number;
    hospital: number;
  };
  myState: PlayerState;
};

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

  const [convocations, setConvocations] = useState<Convocation[]>(() => {
    const teamId = memberships[0]?.teamId ?? "team-1";
    const teamName = memberships[0]?.teamName ?? "Futeboladas";

    return [
      {
        id: "conv-open",
        teamId,
        teamName,
        date: "17 Jan",
        time: "20:00",
        status: "open",
        roster: { ball: 6, couch: 8, hospital: 2 },
        myState: "couch",
      },
      {
        id: "conv-accepted",
        teamId,
        teamName,
        date: "24 Jan",
        time: "19:30",
        status: "accepted",
        roster: { ball: 11, couch: 1, hospital: 0 },
        myState: "ball",
      },
      {
        id: "conv-dismissed",
        teamId,
        teamName,
        date: "02 Feb",
        time: "21:00",
        status: "dismissed",
        roster: { ball: 5, couch: 4, hospital: 3 },
        myState: "hospital",
      },
    ];
  });

  useEffect(() => {
    if (memberships.length === 0) return;
    setConvocations((current) =>
      current.map((convocation) => ({
        ...convocation,
        teamId: memberships[0].teamId,
        teamName: memberships[0].teamName,
      })),
    );
  }, [memberships]);

  const handleVoteChange = (id: string, nextState: PlayerState) => {
    setConvocations((current) =>
      current.map((convocation) =>
        convocation.id === id && convocation.status === "open"
          ? (() => {
              if (convocation.myState === nextState) {
                return convocation;
              }

              const roster = { ...convocation.roster };
              const prevState = convocation.myState;

              if (prevState === "ball") {
                roster.ball = Math.max(0, roster.ball - 1);
              } else if (prevState === "couch") {
                roster.couch = Math.max(0, roster.couch - 1);
              } else {
                roster.hospital = Math.max(0, roster.hospital - 1);
              }

              if (nextState === "ball") {
                roster.ball += 1;
              } else if (nextState === "couch") {
                roster.couch += 1;
              } else {
                roster.hospital += 1;
              }

              return { ...convocation, myState: nextState, roster };
            })()
          : convocation,
      ),
    );
  };

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

  const responseOptions: Array<{ id: PlayerState; label: string; icon: string }> =
    [
      { id: "ball", label: "Bola", icon: "⚽️" },
      { id: "couch", label: "Sofá", icon: "🛋️" },
      { id: "hospital", label: "Hospital", icon: "🏥" },
    ];

  const renderRoster = (
    count: number,
    keyPrefix: string,
    isDimmed: boolean,
    icon: string,
  ) => (
    <div
      className={`flex items-center gap-3 ${isDimmed ? "opacity-50" : ""}`}
    >
      <span className="text-lg">{icon}</span>
      <div className="flex flex-wrap -space-x-4 text-base">
        {Array.from({ length: Math.max(count, 0) }).map((_, index) => (
          <span
            key={`${keyPrefix}-${index}`}
            className="relative flex h-7 w-7 items-center justify-center"
            style={{ zIndex: count - index }}
          >
            {PLAYER_EMOJIS[index % PLAYER_EMOJIS.length]}
          </span>
        ))}
        {count === 0 && (
          <span className="text-xs text-[var(--text-secondary)]">
            Sem jogadores
          </span>
        )}
      </div>
    </div>
  );

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
          {convocations.map((convocation) => {
            const canManage =
              canManageByTeamId.get(convocation.teamId) ?? false;
            const isOpen = convocation.status === "open";

            return (
              <div
                key={convocation.id}
                className="rounded-xl bg-[var(--bg-app)] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {convocation.teamName}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        📅 {convocation.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        🕘 {convocation.time}
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
                        disabled={!isOpen}
                        onClick={() => handleVoteChange(convocation.id, option.id)}
                      >
                        <span className="text-base">{option.icon}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-3">
                  {renderRoster(
                    convocation.roster.ball,
                    `${convocation.id}-b`,
                    convocation.myState !== "ball",
                    "⚽️",
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
                      className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                    >
                      Dispensar
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition-all active:scale-95"
                    >
                      Aceitar
                    </button>
                  </div>
                )}

                {convocation.status !== "open" && canManage && (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                    >
                      Reabrir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
                              setActiveTooltipId(
                                isActive ? null : tooltipId,
                              )
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
