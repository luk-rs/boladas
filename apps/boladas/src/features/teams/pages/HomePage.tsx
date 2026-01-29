import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { supabase } from "../../../lib/supabase";

const MIN_TEAM_MEMBERS = 10;

type IncompleteTeam = {
  id: string;
  name: string;
  memberCount: number;
};

export function HomePage() {
  const { sessionUserId, isSystemAdmin } = useAuth();
  const { memberships, loading: membershipsLoading } = useTeams(
    sessionUserId,
    isSystemAdmin,
  );
  const [incompleteTeams, setIncompleteTeams] = useState<IncompleteTeam[]>([]);
  const [loadingIncomplete, setLoadingIncomplete] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const teamIds = useMemo(
    () => memberships.map((membership) => membership.teamId),
    [memberships],
  );

  useEffect(() => {
    if (!supabase || teamIds.length === 0) {
      setIncompleteTeams([]);
      return;
    }

    let isMounted = true;
    setLoadingIncomplete(true);

    supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds)
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error || !data) {
          setIncompleteTeams([]);
          return;
        }

        const counts = new Map<string, number>();
        teamIds.forEach((teamId) => counts.set(teamId, 0));
        data.forEach((row) => {
          const current = counts.get(row.team_id) ?? 0;
          counts.set(row.team_id, current + 1);
        });

        const mapped = memberships
          .map((membership) => ({
            id: membership.teamId,
            name: membership.teamName,
            memberCount: counts.get(membership.teamId) ?? 0,
          }))
          .filter((team) => team.memberCount < MIN_TEAM_MEMBERS);

        setIncompleteTeams(mapped);
      })
      .finally(() => {
        if (isMounted) setLoadingIncomplete(false);
      });

    return () => {
      isMounted = false;
    };
  }, [memberships, teamIds]);

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
        <div className="mt-4 space-y-3">
          <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
          <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
          <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
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
          {membershipsLoading || loadingIncomplete ? (
            <>
              <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
              <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
            </>
          ) : incompleteTeams.length > 0 ? (
            incompleteTeams.map((team, index) => {
              const emojiRoster = [
                "👱‍♂️",
                "👨‍🦰",
                "👨‍🦱",
                "👨",
                "👨‍🦳",
                "👴",
                "👨‍🦲",
                "🧔",
              ];
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
                          {emojiRoster[emojiIndex % emojiRoster.length]}
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
                    {team.memberCount > MIN_TEAM_MEMBERS && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        +{team.memberCount - MIN_TEAM_MEMBERS}
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
              Nenhuma equipa incompleta por agora.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
