import { useEffect, useState } from "react";
import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { SectionShell } from "../../../shared/layout/SectionShell";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import { useAuth } from "../../auth/useAuth";
import { useTeamScopeContext } from "../../team-scope/context/TeamScopeContext";
import { PLAYER_EMOJIS } from "../../team-scope/constants";
import {
  fetchTeamStandings,
  type PlayerStanding,
  type StandingsSummary,
} from "../services/standings.service";

function getPlayerAvatar(playerId: string, index: number) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash << 5) - hash + playerId.charCodeAt(i);
    hash |= 0;
  }
  const emojiIndex = Math.abs(hash) % PLAYER_EMOJIS.length;
  return PLAYER_EMOJIS[emojiIndex] || PLAYER_EMOJIS[index % PLAYER_EMOJIS.length] || "⚽";
}

export function StandingsPage() {
  const { sessionUserId } = useAuth();
  const {
    state: { memberships, activeTeamId },
  } = useTeamScopeContext();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    activeTeamId || memberships[0]?.teamId || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StandingsSummary>({
    standings: [],
    totalCompletedGames: 0,
    totalGoals: 0,
    averageGoalsPerGame: 0,
  });

  useEffect(() => {
    if (activeTeamId) {
      setSelectedTeamId(activeTeamId);
    } else if (memberships[0]?.teamId && !selectedTeamId) {
      setSelectedTeamId(memberships[0].teamId);
    }
  }, [activeTeamId, memberships, selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchTeamStandings(selectedTeamId).then((result) => {
      if (!isMounted) return;
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  const activeMembership = memberships.find((m) => m.teamId === selectedTeamId) || memberships[0];
  const { standings, totalCompletedGames, totalGoals, averageGoalsPerGame } = data;
  const topThree = standings.slice(0, 3);

  return (
    <PageScaffold title="Classificação" className="space-y-5">
      {memberships.length > 1 && (
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {memberships.map((membership) => {
            const isSelected = membership.teamId === selectedTeamId;
            return (
              <button
                key={membership.teamId}
                type="button"
                onClick={() => setSelectedTeamId(membership.teamId)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-primary-600 text-white shadow-sm"
                    : "border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {membership.teamName}
              </button>
            );
          })}
        </section>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            A calcular classificação...
          </p>
        </div>
      ) : error ? (
        <SurfaceTile variant="danger" className="p-4 text-center text-sm text-rose-600">
          {error}
        </SurfaceTile>
      ) : standings.length === 0 ? (
        <SectionShell
          title={activeMembership?.teamName ? `Equipa: ${activeMembership.teamName}` : "Classificação"}
          variant="strong"
          bodyClassName="mt-3"
        >
          <SurfaceTile variant="dashed" className="p-6 text-center">
            <span className="text-3xl" aria-hidden>
              ⚽
            </span>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              Ainda sem jogos registados
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Assim que os gestores concluírem os primeiros jogos com resultado final, a classificação por jogador será calculada automaticamente aqui.
            </p>
          </SurfaceTile>
        </SectionShell>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <SurfaceTile variant="strong" className="p-3 text-center">
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {totalCompletedGames}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                Jogos
              </p>
            </SurfaceTile>
            <SurfaceTile variant="strong" className="p-3 text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {totalGoals}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                Golos
              </p>
            </SurfaceTile>
            <SurfaceTile variant="strong" className="p-3 text-center">
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {averageGoalsPerGame}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                Média / Jogo
              </p>
            </SurfaceTile>
          </div>

          {/* Podium (Top 3) */}
          {topThree.length > 0 && (
            <SectionShell title="Pódio" variant="strong" bodyClassName="mt-2">
              <div className="grid grid-cols-3 gap-2 items-end pt-3">
                {/* 2nd Place */}
                {topThree[1] ? (
                  <SurfaceTile
                    variant="soft"
                    className="flex flex-col items-center p-2.5 text-center border-slate-300/80 dark:border-slate-600"
                  >
                    <span className="text-xl">🥈</span>
                    <span className="mt-1 text-xl" aria-hidden>
                      {getPlayerAvatar(topThree[1].playerId, 1)}
                    </span>
                    <p className="mt-1 w-full truncate text-xs font-semibold text-[var(--text-primary)]">
                      {topThree[1].playerName}
                    </p>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {topThree[1].points} <span className="text-[9px] font-normal">pts</span>
                    </p>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {topThree[1].wins}V · {topThree[1].gamesPlayed}J
                    </span>
                  </SurfaceTile>
                ) : (
                  <div />
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <SurfaceTile
                    variant="soft"
                    className="flex flex-col items-center p-3 text-center border-amber-400/90 shadow-md ring-1 ring-amber-400/50 bg-amber-500/10 dark:bg-amber-500/15"
                  >
                    <span className="text-2xl animate-bounce">👑</span>
                    <span className="mt-0.5 text-2xl" aria-hidden>
                      {getPlayerAvatar(topThree[0].playerId, 0)}
                    </span>
                    <p className="mt-1 w-full truncate text-xs font-bold text-[var(--text-primary)]">
                      {topThree[0].playerName}
                    </p>
                    <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {topThree[0].points} <span className="text-[10px] font-medium">pts</span>
                    </p>
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                      {topThree[0].wins}V · {topThree[0].gamesPlayed}J
                    </span>
                  </SurfaceTile>
                )}

                {/* 3rd Place */}
                {topThree[2] ? (
                  <SurfaceTile
                    variant="soft"
                    className="flex flex-col items-center p-2.5 text-center border-amber-700/60 dark:border-amber-800"
                  >
                    <span className="text-xl">🥉</span>
                    <span className="mt-1 text-xl" aria-hidden>
                      {getPlayerAvatar(topThree[2].playerId, 2)}
                    </span>
                    <p className="mt-1 w-full truncate text-xs font-semibold text-[var(--text-primary)]">
                      {topThree[2].playerName}
                    </p>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-500">
                      {topThree[2].points} <span className="text-[9px] font-normal">pts</span>
                    </p>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {topThree[2].wins}V · {topThree[2].gamesPlayed}J
                    </span>
                  </SurfaceTile>
                ) : (
                  <div />
                )}
              </div>
            </SectionShell>
          )}

          {/* Full Table */}
          <SectionShell
            title={`Tabela Geral (${activeMembership?.teamName || "Equipa"})`}
            variant="strong"
            bodyClassName="mt-2"
          >
            <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
              <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2.5rem_2.5rem] items-center gap-1 border-b border-[var(--border-color)] bg-[var(--bg-app)]/80 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <span className="text-center">#</span>
                <span>Jogador</span>
                <span className="text-center" title="Jogos disputados">J</span>
                <span className="text-center" title="Vitórias">V</span>
                <span className="text-center" title="Empates">E</span>
                <span className="text-center" title="Diferença de golos">DG</span>
                <span className="text-right pr-1" title="Pontos">Pts</span>
              </div>

              <div className="divide-y divide-[var(--border-color)]">
                {standings.map((player, index) => {
                  const isSelf = player.playerId === sessionUserId;
                  const rank = index + 1;
                  const dgFormatted =
                    player.goalDifference > 0
                      ? `+${player.goalDifference}`
                      : `${player.goalDifference}`;

                  return (
                    <div
                      key={player.playerId}
                      className={`grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2.5rem_2.5rem] items-center gap-1 px-2 py-2.5 text-xs transition-colors ${
                        isSelf
                          ? "bg-primary-500/10 font-medium"
                          : "hover:bg-[var(--bg-app)]/40"
                      }`}
                    >
                      <span className="text-center font-bold text-[var(--text-secondary)]">
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                      </span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="text-sm shrink-0" aria-hidden>
                          {getPlayerAvatar(player.playerId, index)}
                        </span>
                        <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                          {player.playerName}
                        </span>
                        {isSelf && (
                          <span className="shrink-0 rounded bg-primary-100 px-1 py-0.2 text-[9px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            Tu
                          </span>
                        )}
                        {player.isGuest && (
                          <span className="shrink-0 rounded bg-slate-200 px-1 py-0.2 text-[9px] text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            Conv.
                          </span>
                        )}
                      </div>
                      <span className="text-center text-[var(--text-secondary)]">
                        {player.gamesPlayed}
                      </span>
                      <span className="text-center text-emerald-600 dark:text-emerald-400 font-medium">
                        {player.wins}
                      </span>
                      <span className="text-center text-[var(--text-secondary)]">
                        {player.draws}
                      </span>
                      <span
                        className={`text-center font-mono text-[11px] ${
                          player.goalDifference > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : player.goalDifference < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {dgFormatted}
                      </span>
                      <span className="text-right pr-1 font-bold text-base tabular-nums text-primary-600 dark:text-primary-400">
                        {player.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionShell>
        </>
      )}
    </PageScaffold>
  );
}
