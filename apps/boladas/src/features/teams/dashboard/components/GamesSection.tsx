import { UpcomingGame } from "../types";
import { formatSchedule } from "../utils";
import { EmojiStack } from "./EmojiStack";

export type GamesSectionProps = {
  games: UpcomingGame[];
  loading: boolean;
  canManageByTeamId: Map<string, boolean>;
  cancellingGameId: string | null;
  onCancelGame: (game: UpcomingGame) => void;
};

export function GamesSection({
  games,
  loading,
  canManageByTeamId,
  cancellingGameId,
  onCancelGame,
}: GamesSectionProps) {
  return (
    <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Jogos
          </p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Próximos jogos
          </h2>
        </div>
        <span className="text-2xl">🏟️</span>
      </header>
      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <div className="h-32 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
            <div className="h-32 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
          </>
        ) : games.length > 0 ? (
          games.map((game, index) => {
            const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);
            const canManage = canManageByTeamId.get(game.teamId) ?? false;
            const isCancelling = cancellingGameId === game.id;

            return (
              <div
                key={game.id}
                className={`rounded-xl px-4 py-4 ${
                  index === 0
                    ? "bg-emerald-50/80 dark:bg-emerald-900/20"
                    : "bg-[var(--bg-app)]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {game.teamName}
                    </p>
                    {index === 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                        Próximo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      📅 {dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      🕘 {timeLabel}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                  </div>

                  {canManage && game.convocationId && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onCancelGame(game)}
                        disabled={isCancelling}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-200"
                        title="Dispensar jogo"
                      >
                        💤
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-4 text-center text-sm text-[var(--text-secondary)]">
            Sem próximos jogos.
          </div>
        )}
      </div>
    </section>
  );
}
