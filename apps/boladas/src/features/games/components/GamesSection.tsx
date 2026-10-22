import { useMemo, useState } from "react";
import type { Game, GameLineupPlayer, GameResultScores } from "../types";
import { formatSchedule, hasRecordedScore } from "../utils";
import {
  EmojiStack,
  type EmojiStackItem,
} from "../../team-scope/components/EmojiStack";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import { RecordResultSheet } from "./RecordResultSheet";
import { LiveMatchModal } from "./LiveMatchModal";

function lineupStack(
  players: GameLineupPlayer[],
  sessionUserId: string | null,
): EmojiStackItem[] {
  return [...players]
    .sort(
      (left, right) =>
        (left.slot ?? Number.MAX_SAFE_INTEGER) - (right.slot ?? Number.MAX_SAFE_INTEGER),
    )
    .map((player, index) => ({
      id: player.id ?? `lineup-${index}`,
      label: player.name,
      isSelf: Boolean(player.id && player.id === sessionUserId),
    }));
}

export type GamesSectionProps = {
  games: Game[];
  loading: boolean;
  loadError: string | null;
  canManageByTeamId: Map<string, boolean>;
  cancellingGameId: string | null;
  recordingGameId: string | null;
  sessionUserId: string | null;
  onCancelGame: (game: Game) => void;
  onRecordResult: (gameId: string, scores: GameResultScores) => Promise<string | null>;
};

export function GamesSection({
  games,
  loading,
  loadError,
  canManageByTeamId,
  cancellingGameId,
  recordingGameId,
  sessionUserId,
  onCancelGame,
  onRecordResult,
}: GamesSectionProps) {
  const [resultGame, setResultGame] = useState<Game | null>(null);
  const [liveGame, setLiveGame] = useState<Game | null>(null);

  // Partition games into Scheduled (Upcoming) and Completed (Past)
  const scheduledGames = useMemo(() => {
    return games
      .filter((g) => g.status !== "completed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [games]);

  const completedGames = useMemo(() => {
    return games
      .filter((g) => g.status === "completed")
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.scheduledAt).getTime();
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.scheduledAt).getTime();
        return timeB - timeA;
      });
  }, [games]);

  const nextGameId = scheduledGames[0]?.id ?? null;

  const renderGameCard = (game: Game) => {
    const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);
    const canManage = canManageByTeamId.get(game.teamId) ?? false;
    const isCancelling = cancellingGameId === game.id;
    const isNext = game.id === nextGameId;
    const showScore = hasRecordedScore(game);
    const canCancel =
      canManage &&
      Boolean(game.convocationId) &&
      game.status !== "completed";

    const durationLabel =
      game.durationSeconds != null && game.durationSeconds > 0
        ? game.durationSeconds < 60
          ? `${game.durationSeconds}s`
          : game.durationSeconds % 60 === 0
            ? `${Math.floor(game.durationSeconds / 60)} min`
            : `${Math.floor(game.durationSeconds / 60)}m ${game.durationSeconds % 60}s`
        : null;

    return (
      <SurfaceTile
        key={game.id}
        variant="soft"
        className={`px-4 py-4 ${
          isNext ? "bg-emerald-50/80 dark:bg-emerald-900/20" : ""
        }`}
      >
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-1">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {game.teamName}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {isNext && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                  Próximo
                </span>
              )}
              {game.status === "completed" && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
                  Concluído
                </span>
              )}
              {durationLabel != null && (
                <span className="rounded-full bg-slate-100 border border-slate-300/60 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                  ⏱️ {durationLabel}
                </span>
              )}
            </div>
          </div>

          {showScore && (
            <p
              className="flex items-center justify-center gap-4 text-2xl font-bold tabular-nums text-[var(--text-primary)]"
              aria-label={`Resultado: camisolas ${game.shirtsScore}, coletes ${game.coletesScore}`}
            >
              <span>
                <span className="mr-1 text-base" aria-hidden>
                  👕
                </span>
                {game.shirtsScore}
              </span>
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                –
              </span>
              <span>
                {game.coletesScore}
                <span className="ml-1 text-base" aria-hidden>
                  🦺
                </span>
              </span>
            </p>
          )}

          {/* Goal events timeline chips if available */}
          {game.matchEvents && game.matchEvents.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border-color)]/60">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Golos:</span>
              {game.matchEvents.map((evt, idx) => (
                <span
                  key={evt.id || idx}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    evt.team === "shirts"
                      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  }`}
                >
                  <span>{evt.team === "shirts" ? "👕" : "🦺"}</span>
                  <span>{evt.minute ? `${evt.minute}'` : evt.timeLabel}</span>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1">
                📅 {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                🕘 {timeLabel}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <SurfaceTile
                  variant="strong"
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    👕
                  </span>
                  {game.shirtsLineup.length > 0 ? (
                    <EmojiStack
                      items={lineupStack(game.shirtsLineup, sessionUserId)}
                      showTooltip
                      className="text-sm"
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      Sem camisolas
                    </span>
                  )}
                </SurfaceTile>
                <SurfaceTile
                  variant="strong"
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    🦺
                  </span>
                  {game.coletesLineup.length > 0 ? (
                    <EmojiStack
                      items={lineupStack(game.coletesLineup, sessionUserId)}
                      showTooltip
                      className="text-sm"
                    />
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      Sem coletes
                    </span>
                  )}
                </SurfaceTile>
              </div>
            </div>
          </div>

          {(game.canRecordResult || canCancel) && (
            <div className="flex items-center justify-end gap-2">
              {game.canRecordResult && game.status !== "completed" && (
                <button
                  type="button"
                  onClick={() => setLiveGame(game)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-[0.99]"
                  title="Acompanhar jogo em direto com cronómetro e placar"
                >
                  <span aria-hidden>▶️</span>
                  <span>Em Direto</span>
                </button>
              )}
              {game.canRecordResult && (
                <button
                  type="button"
                  onClick={() => setResultGame(game)}
                  disabled={recordingGameId === game.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:border-primary-500 active:scale-[0.99] disabled:opacity-60"
                >
                  Registar resultado
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => onCancelGame(game)}
                  disabled={isCancelling}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-200"
                  title="Dispensar jogo"
                >
                  💤
                </button>
              )}
            </div>
          )}
        </div>
      </SurfaceTile>
    );
  };

  return (
    <section className="rounded-2xl p-5">
      <div className="space-y-5">
        {loadError && (
          <SurfaceTile
            variant="danger"
            role="alert"
            className="p-4 text-center text-sm text-rose-600"
          >
            {loadError}
          </SurfaceTile>
        )}

        {loading ? (
          <>
            <SurfaceTile variant="dashed" className="h-32 p-0" />
            <SurfaceTile variant="dashed" className="h-32 p-0" />
          </>
        ) : (
          <>
            {/* Scheduled / Upcoming Games Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  ⚡ Jogos Agendados ({scheduledGames.length})
                </span>
              </div>

              {scheduledGames.length > 0 ? (
                <div className="space-y-3">
                  {scheduledGames.map(renderGameCard)}
                </div>
              ) : (
                <SurfaceTile
                  variant="dashed"
                  className="p-4 text-center text-sm text-[var(--text-secondary)]"
                >
                  Nenhum jogo agendado de momento.
                </SurfaceTile>
              )}
            </div>

            {/* Completed / Past Games Collapsible Expander (Clean transparent header, no card background) */}
            {completedGames.length > 0 && (
              <details className="group/expander pt-2">
                <summary className="flex cursor-pointer items-center justify-between py-2 px-1 font-semibold text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] select-none list-none transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider">📜 Jogos Anteriores</span>
                    <span className="rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-secondary)]">
                      {completedGames.length}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] transition-transform duration-200 group-open/expander:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  {completedGames.map(renderGameCard)}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <RecordResultSheet
        key={resultGame?.id ?? "closed"}
        game={resultGame}
        submitting={recordingGameId !== null && recordingGameId === resultGame?.id}
        onClose={() => {
          if (recordingGameId) return;
          setResultGame(null);
        }}
        onSubmit={async (scores) => {
          if (!resultGame) return "Jogo não encontrado.";
          const error = await onRecordResult(resultGame.id, scores);
          if (!error) setResultGame(null);
          return error;
        }}
      />

      <LiveMatchModal
        key={liveGame?.id ?? "live-closed"}
        game={liveGame}
        isOpen={liveGame !== null}
        onClose={() => setLiveGame(null)}
        onFinishMatch={async (scores) => {
          if (!liveGame) return "Jogo não encontrado.";
          const error = await onRecordResult(liveGame.id, scores);
          if (!error) setLiveGame(null);
          return error;
        }}
      />
    </section>
  );
}
