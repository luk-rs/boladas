import { useState } from "react";
import type { Game, GameResultScores } from "../types";
import { formatSchedule, hasRecordedScore } from "../utils";
import { EmojiStack } from "../../team-scope/components/EmojiStack";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import { RecordResultSheet } from "./RecordResultSheet";

export type GamesSectionProps = {
  games: Game[];
  loading: boolean;
  loadError: string | null;
  canManageByTeamId: Map<string, boolean>;
  cancellingGameId: string | null;
  recordingGameId: string | null;
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
  onCancelGame,
  onRecordResult,
}: GamesSectionProps) {
  const [resultGame, setResultGame] = useState<Game | null>(null);
  const now = Date.now();
  const nextGameId =
    games.find((game) => {
      if (game.status === "completed") return false;
      const kickoff = Date.parse(game.scheduledAt);
      return !Number.isNaN(kickoff) && kickoff >= now;
    })?.id ?? null;

  return (
    <section className="rounded-2xl p-5">
      <div className="space-y-3">
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
        ) : games.length > 0 ? (
          games.map((game) => {
            const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);
            const canManage = canManageByTeamId.get(game.teamId) ?? false;
            const isCancelling = cancellingGameId === game.id;
            const isNext = game.id === nextGameId;
            const showScore = hasRecordedScore(game);
            const canCancel =
              canManage &&
              Boolean(game.convocationId) &&
              game.status !== "completed";

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
                    {isNext && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                        Próximo
                      </span>
                    )}
                    {game.status === "completed" && (
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
                        Concluído
                      </span>
                    )}
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
                              items={game.shirtsLineup}
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
                              items={game.coletesLineup}
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
                      {game.canRecordResult && (
                        <button
                          type="button"
                          onClick={() => setResultGame(game)}
                          disabled={recordingGameId === game.id}
                          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 active:scale-[0.99] disabled:opacity-60"
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
          })
        ) : loadError ? null : (
          <SurfaceTile
            variant="dashed"
            className="p-4 text-center text-sm text-[var(--text-secondary)]"
          >
            Sem jogos.
          </SurfaceTile>
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
    </section>
  );
}
