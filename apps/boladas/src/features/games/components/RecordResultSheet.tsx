import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import type { Game, GameLineupPlayer, GameResultScores, GoalEvent } from "../types";
import { formatSchedule, parseScoreField, scoreFormError } from "../utils";

function scoreInputValue(score: number | null | undefined): string {
  return typeof score === "number" ? String(score) : "";
}

export type RecordResultSheetProps = {
  game: Game | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (scores: GameResultScores) => Promise<string | null>;
};

export function RecordResultSheet({
  game,
  submitting,
  onClose,
  onSubmit,
}: RecordResultSheetProps) {
  const shirtsId = useId();
  const coletesId = useId();
  const errorId = useId();
  const [shirts, setShirts] = useState(() => scoreInputValue(game?.shirtsScore));
  const [coletes, setColetes] = useState(() => scoreInputValue(game?.coletesScore));
  const [playerGoals, setPlayerGoals] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;
    setShirts(scoreInputValue(game.shirtsScore));
    setColetes(scoreInputValue(game.coletesScore));
    const initialCounts: Record<string, number> = {};
    if (Array.isArray(game.matchEvents)) {
      for (const evt of game.matchEvents) {
        const key = evt.playerId || evt.playerName;
        if (key) {
          initialCounts[key] = (initialCounts[key] || 0) + 1;
        }
      }
    }
    setPlayerGoals(initialCounts);
    setFormError(null);
  }, [game]);

  const assignedShirtsCount = useMemo(() => {
    if (!game) return 0;
    return game.shirtsLineup.reduce((acc, p) => {
      const key = p.id || p.name || "";
      return acc + (playerGoals[key] || 0);
    }, 0);
  }, [game, playerGoals]);

  const assignedColetesCount = useMemo(() => {
    if (!game) return 0;
    return game.coletesLineup.reduce((acc, p) => {
      const key = p.id || p.name || "";
      return acc + (playerGoals[key] || 0);
    }, 0);
  }, [game, playerGoals]);

  if (!game) return null;

  const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);

  const updatePlayerGoal = (
    team: "shirts" | "coletes",
    player: GameLineupPlayer,
    delta: number,
  ) => {
    const key = player.id || player.name || "";
    if (!key) return;

    setPlayerGoals((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      const nextMap = { ...prev, [key]: next };

      const lineup = team === "shirts" ? game.shirtsLineup : game.coletesLineup;
      const totalAssigned = lineup.reduce((acc, p) => {
        const pKey = p.id || p.name || "";
        return acc + (nextMap[pKey] || 0);
      }, 0);

      if (team === "shirts") {
        setShirts((s) => {
          const val = parseInt(s, 10);
          return String(Math.max(Number.isNaN(val) ? 0 : val, totalAssigned));
        });
      } else {
        setColetes((s) => {
          const val = parseInt(s, 10);
          return String(Math.max(Number.isNaN(val) ? 0 : val, totalAssigned));
        });
      }

      return nextMap;
    });
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = scoreFormError(shirts, coletes);
    if (message) {
      setFormError(message);
      return;
    }

    const parsedShirts = parseScoreField(shirts);
    const parsedColetes = parseScoreField(coletes);
    if (!parsedShirts.ok || !parsedColetes.ok) return;

    // Build matchEvents array
    const matchEvents: GoalEvent[] = [];

    // Shirts goals
    let shirtsIdx = 0;
    for (const p of game.shirtsLineup) {
      const key = p.id || p.name || "";
      const count = playerGoals[key] || 0;
      for (let i = 0; i < count; i += 1) {
        shirtsIdx += 1;
        const minute = Math.min(90, shirtsIdx * 6);
        matchEvents.push({
          id: `goal-shirts-${shirtsIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          team: "shirts",
          elapsedSeconds: minute * 60,
          minute,
          timeLabel: `${minute}:00`,
          playerId: p.id,
          playerName: p.name,
        });
      }
    }
    // Remaining unassigned shirts goals
    for (let i = shirtsIdx; i < parsedShirts.value; i += 1) {
      shirtsIdx += 1;
      const minute = Math.min(90, shirtsIdx * 6);
      matchEvents.push({
        id: `goal-shirts-${shirtsIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        team: "shirts",
        elapsedSeconds: minute * 60,
        minute,
        timeLabel: `${minute}:00`,
      });
    }

    // Coletes goals
    let coletesIdx = 0;
    for (const p of game.coletesLineup) {
      const key = p.id || p.name || "";
      const count = playerGoals[key] || 0;
      for (let i = 0; i < count; i += 1) {
        coletesIdx += 1;
        const minute = Math.min(90, coletesIdx * 6);
        matchEvents.push({
          id: `goal-coletes-${coletesIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          team: "coletes",
          elapsedSeconds: minute * 60,
          minute,
          timeLabel: `${minute}:00`,
          playerId: p.id,
          playerName: p.name,
        });
      }
    }
    // Remaining unassigned coletes goals
    for (let i = coletesIdx; i < parsedColetes.value; i += 1) {
      coletesIdx += 1;
      const minute = Math.min(90, coletesIdx * 6);
      matchEvents.push({
        id: `goal-coletes-${coletesIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        team: "coletes",
        elapsedSeconds: minute * 60,
        minute,
        timeLabel: `${minute}:00`,
      });
    }

    // Sort chronologically
    matchEvents.sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

    const error = await onSubmit({
      shirtsScore: parsedShirts.value,
      coletesScore: parsedColetes.value,
      matchEvents,
    });
    if (error) setFormError(error);
  };

  const parsedShirtsVal = parseInt(shirts, 10) || 0;
  const parsedColetesVal = parseInt(coletes, 10) || 0;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        aria-label="Fechar"
        onClick={onClose}
        disabled={submitting}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[500px] max-h-[90vh] overflow-y-auto animate-in rounded-t-3xl bg-[var(--bg-app)] p-5 md:p-6 shadow-2xl slide-in-from-bottom duration-300">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Registar resultado
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {game.teamName} · {dateLabel} · {timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-60"
          >
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {game.status === "completed" && (
            <p className="text-xs text-[var(--text-secondary)]">
              Podes corrigir o resultado e os marcadores. A data em que foi registado mantém-se.
            </p>
          )}

          {/* Score Inputs */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <label htmlFor={shirtsId} className="space-y-1.5">
              <span className="block text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                👕 Camisolas
              </span>
              <input
                id={shirtsId}
                inputMode="numeric"
                autoComplete="off"
                value={shirts}
                onChange={(event) => {
                  setShirts(event.target.value);
                  setFormError(null);
                }}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? errorId : undefined}
                className="h-14 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-center text-2xl font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-primary-400"
              />
            </label>
            <span className="pb-4 text-sm font-semibold text-[var(--text-secondary)]">
              vs
            </span>
            <label htmlFor={coletesId} className="space-y-1.5">
              <span className="block text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                Coletes 🦺
              </span>
              <input
                id={coletesId}
                inputMode="numeric"
                autoComplete="off"
                value={coletes}
                onChange={(event) => {
                  setColetes(event.target.value);
                  setFormError(null);
                }}
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? errorId : undefined}
                className="h-14 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-center text-2xl font-bold tabular-nums text-[var(--text-primary)] outline-none focus:border-primary-400"
              />
            </label>
          </div>

          {/* Goal Scorers Assignment Section */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                ⚽ Marcadores dos Golos
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Toque em ＋ para atribuir golos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {/* Shirts Lineup */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-50/40 dark:bg-sky-950/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
                  <span>👕 Camisolas</span>
                  <span className="tabular-nums">
                    {assignedShirtsCount} / {parsedShirtsVal} golos
                  </span>
                </div>
                {game.shirtsLineup.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Sem jogadores</p>
                ) : (
                  game.shirtsLineup.map((p, idx) => {
                    const key = p.id || p.name || String(idx);
                    const count = playerGoals[key] || 0;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-1 rounded-lg bg-[var(--bg-surface)] px-2 py-1 text-xs border border-[var(--border-color)]"
                      >
                        <span className="truncate max-w-[120px] font-medium text-[var(--text-primary)]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updatePlayerGoal("shirts", p, -1)}
                            disabled={count <= 0}
                            className="h-6 w-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 font-bold text-xs disabled:opacity-30 active:scale-95"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold tabular-nums text-sky-600 dark:text-sky-400">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => updatePlayerGoal("shirts", p, 1)}
                            className="h-6 w-6 flex items-center justify-center rounded bg-sky-600 text-white font-bold text-xs active:scale-95"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Coletes Lineup */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span>🦺 Coletes</span>
                  <span className="tabular-nums">
                    {assignedColetesCount} / {parsedColetesVal} golos
                  </span>
                </div>
                {game.coletesLineup.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Sem jogadores</p>
                ) : (
                  game.coletesLineup.map((p, idx) => {
                    const key = p.id || p.name || String(idx);
                    const count = playerGoals[key] || 0;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-1 rounded-lg bg-[var(--bg-surface)] px-2 py-1 text-xs border border-[var(--border-color)]"
                      >
                        <span className="truncate max-w-[120px] font-medium text-[var(--text-primary)]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updatePlayerGoal("coletes", p, -1)}
                            disabled={count <= 0}
                            className="h-6 w-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 font-bold text-xs disabled:opacity-30 active:scale-95"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => updatePlayerGoal("coletes", p, 1)}
                            className="h-6 w-6 flex items-center justify-center rounded bg-amber-600 text-white font-bold text-xs active:scale-95"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {formError && (
            <p
              id={errorId}
              role="alert"
              className="rounded-xl border border-rose-300/60 bg-rose-50/70 px-3 py-2 text-center text-sm text-rose-600 dark:border-rose-700/40 dark:bg-rose-900/10"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/20 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? "A guardar..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
