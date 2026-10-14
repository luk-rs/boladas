import { useEffect, useState } from "react";
import type { Game, GameResultScores } from "../types";
import { formatSchedule } from "../utils";

export type LiveMatchModalProps = {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onFinishMatch: (scores: GameResultScores) => Promise<string | null>;
};

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function LiveMatchModal({
  game,
  isOpen,
  onClose,
  onFinishMatch,
}: LiveMatchModalProps) {
  const [shirtsScore, setShirtsScore] = useState(0);
  const [coletesScore, setColetesScore] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = game ? `boladas_live_match_${game.id}` : null;

  // Restore state from localStorage if available
  useEffect(() => {
    if (!game || !storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setShirtsScore(parsed.shirtsScore ?? 0);
        setColetesScore(parsed.coletesScore ?? 0);
        setElapsedSeconds(parsed.elapsedSeconds ?? 0);
        setIsRunning(Boolean(parsed.isRunning));
        return;
      }
    } catch {
      // Ignore storage errors
    }
    setShirtsScore(0);
    setColetesScore(0);
    setElapsedSeconds(0);
    setIsRunning(false);
    setError(null);
  }, [game, storageKey]);

  // Persist state to localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          shirtsScore,
          coletesScore,
          elapsedSeconds,
          isRunning,
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, shirtsScore, coletesScore, elapsedSeconds, isRunning]);

  // Match clock tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  if (!isOpen || !game) return null;

  const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);
    const resultError = await onFinishMatch({
      shirtsScore,
      coletesScore,
    });
    setSubmitting(false);

    if (resultError) {
      setError(resultError);
    } else {
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="fixed inset-x-0 bottom-0 top-12 mx-auto flex max-w-lg flex-col rounded-t-3xl border-t border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-2xl transition-all sm:top-16">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {game.teamName}
              </h2>
              <p className="text-[10px] text-[var(--text-secondary)]">
                📅 {dateLabel} • 🕘 {timeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-app)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Fechar / Minimizar"
          >
            ✕
          </button>
        </div>

        {/* Timer Section */}
        <div className="my-4 flex flex-col items-center justify-center rounded-2xl bg-[var(--bg-app)]/70 p-4 border border-[var(--border-color)]">
          <div className="font-mono text-4xl font-extrabold tracking-wider tabular-nums text-[var(--text-primary)]">
            {formatTimer(elapsedSeconds)}
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 ${
                isRunning
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              <span>{isRunning ? "⏸️ Pausa" : "▶️ Iniciar"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setElapsedSeconds(0);
              }}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
              title="Reiniciar cronómetro"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Live Scoreboard */}
        <div className="grid grid-cols-2 gap-4 my-2">
          {/* Shirts Side */}
          <div className="flex flex-col items-center rounded-2xl border border-[var(--border-color)] bg-sky-500/5 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <span className="text-base" aria-hidden>👕</span>
              <span>Camisolas</span>
            </div>
            <div className="my-2 text-5xl font-black tabular-nums text-[var(--text-primary)]">
              {shirtsScore}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShirtsScore((s) => Math.max(0, s - 1))}
                disabled={shirtsScore <= 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-base font-bold text-[var(--text-primary)] hover:border-sky-500 active:scale-90 disabled:opacity-40"
                title="Subtrair golo às camisolas"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setShirtsScore((s) => s + 1)}
                className="flex h-9 w-12 items-center justify-center rounded-xl bg-sky-600 text-base font-bold text-white shadow-md shadow-sky-600/30 hover:bg-sky-500 active:scale-90"
                title="Golo das camisolas!"
              >
                ＋
              </button>
            </div>
            {/* Quick Lineup preview */}
            <div className="mt-4 w-full space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] text-center">
                Plantel ({game.shirtsLineup.length})
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-none">
                {game.shirtsLineup.map((p, i) => (
                  <p key={p.id ?? i} className="text-xs text-[var(--text-primary)] truncate text-center">
                    {p.name}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Coletes Side */}
          <div className="flex flex-col items-center rounded-2xl border border-[var(--border-color)] bg-amber-500/5 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span className="text-base" aria-hidden>🦺</span>
              <span>Coletes</span>
            </div>
            <div className="my-2 text-5xl font-black tabular-nums text-[var(--text-primary)]">
              {coletesScore}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setColetesScore((s) => Math.max(0, s - 1))}
                disabled={coletesScore <= 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-base font-bold text-[var(--text-primary)] hover:border-amber-500 active:scale-90 disabled:opacity-40"
                title="Subtrair golo aos coletes"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setColetesScore((s) => s + 1)}
                className="flex h-9 w-12 items-center justify-center rounded-xl bg-amber-600 text-base font-bold text-white shadow-md shadow-amber-600/30 hover:bg-amber-500 active:scale-90"
                title="Golo dos coletes!"
              >
                ＋
              </button>
            </div>
            {/* Quick Lineup preview */}
            <div className="mt-4 w-full space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] text-center">
                Plantel ({game.coletesLineup.length})
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-none">
                {game.coletesLineup.map((p, i) => (
                  <p key={p.id ?? i} className="text-xs text-[var(--text-primary)] truncate text-center">
                    {p.name}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-center text-xs text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-auto border-t border-[var(--border-color)] pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
          >
            Manter em aberto
          </button>
          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-60"
          >
            <span>{submitting ? "A guardar..." : "🏁 Terminar & Submeter Resultado"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
