import { useEffect, useRef, useState } from "react";
import type { Game, GameResultScores, GoalEvent } from "../types";
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
  const [goalEvents, setGoalEvents] = useState<GoalEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
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
        if (Array.isArray(parsed.goalEvents)) {
          setGoalEvents(parsed.goalEvents);
        }
        return;
      }
    } catch {
      // Ignore storage errors
    }
    setShirtsScore(0);
    setColetesScore(0);
    setElapsedSeconds(0);
    setIsRunning(false);
    setGoalEvents([]);
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
          goalEvents,
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, shirtsScore, coletesScore, elapsedSeconds, isRunning, goalEvents]);

  // Match clock tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Track fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (!isOpen || !game) return null;

  const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const addGoal = (team: "shirts" | "coletes") => {
    const minute = Math.floor(elapsedSeconds / 60) + 1;
    const timeLabel = formatTimer(elapsedSeconds);
    const newGoal: GoalEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      team,
      elapsedSeconds,
      timeLabel,
      minute,
    };

    if (team === "shirts") {
      setShirtsScore((s) => s + 1);
    } else {
      setColetesScore((s) => s + 1);
    }
    setGoalEvents((prev) => [...prev, newGoal]);
  };

  const removeGoal = (team: "shirts" | "coletes") => {
    if (team === "shirts") {
      if (shirtsScore <= 0) return;
      setShirtsScore((s) => Math.max(0, s - 1));
    } else {
      if (coletesScore <= 0) return;
      setColetesScore((s) => Math.max(0, s - 1));
    }

    setGoalEvents((prev) => {
      const reversed = [...prev].reverse();
      const matchIndex = reversed.findIndex((g) => g.team === team);
      if (matchIndex === -1) return prev;
      const actualIndex = prev.length - 1 - matchIndex;
      return prev.filter((_, i) => i !== actualIndex);
    });
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);
    const resultError = await onFinishMatch({
      shirtsScore,
      coletesScore,
      durationSeconds: elapsedSeconds,
      matchEvents: goalEvents,
    });
    setSubmitting(false);

    if (resultError) {
      setError(resultError);
    } else {
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore
        }
      }
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[150] flex flex-col bg-slate-950 text-slate-100 select-none overflow-y-auto landscape:overflow-hidden"
    >
      {/* Top Broadcast Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-rose-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span>EM DIRETO</span>
          </span>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              {game.teamName}
            </h1>
            <p className="text-[10px] text-slate-400">
              📅 {dateLabel} • 🕘 {timeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            title="Alternar Ecrã Inteiro / Landscape"
          >
            <span>{isFullscreen ? "🗗 Reduzir" : "⛶ Ecrã Inteiro"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            title="Minimizar / Fechar"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Pitch Arena (Optimized for Landscape Fullscreen) */}
      <main className="flex-1 flex flex-col landscape:flex-row items-stretch justify-between p-3 md:p-6 gap-3 md:gap-6 min-h-0">
        {/* Left Column: Camisolas (👕) */}
        <section className="flex-1 flex flex-col items-center justify-between rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/40 via-slate-900/60 to-slate-950 p-4 shadow-xl shadow-sky-950/20">
          <div className="flex items-center gap-2 text-sky-400 text-sm md:text-base font-black tracking-wider uppercase">
            <span className="text-xl md:text-2xl" aria-hidden>👕</span>
            <span>Camisolas</span>
          </div>

          <div className="my-2 md:my-auto flex flex-col items-center">
            <div className="font-mono text-7xl md:text-9xl font-black tabular-nums text-sky-200 drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]">
              {shirtsScore}
            </div>

            <div className="mt-2 md:mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => removeGoal("shirts")}
                disabled={shirtsScore <= 0}
                className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-950/50 text-xl font-bold text-sky-200 hover:bg-sky-900/60 active:scale-90 disabled:opacity-30 transition-all"
                title="Anular golo"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => addGoal("shirts")}
                className="flex h-12 px-6 md:h-14 md:px-8 items-center justify-center gap-2 rounded-xl bg-sky-500 text-base md:text-lg font-black text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 active:scale-95 transition-all"
                title="Golo das Camisolas!"
              >
                <span>＋ GOLO</span>
              </button>
            </div>
          </div>

          {/* Lineup list */}
          <div className="w-full mt-2 pt-2 border-t border-sky-500/20">
            <p className="text-[10px] uppercase font-bold tracking-wider text-sky-400/80 text-center mb-1">
              Plantel ({game.shirtsLineup.length})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 max-h-16 md:max-h-24 overflow-y-auto scrollbar-none">
              {game.shirtsLineup.map((p, i) => (
                <span
                  key={p.id ?? i}
                  className="rounded bg-sky-950/60 border border-sky-500/20 px-2 py-0.5 text-[10px] text-sky-200 truncate"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Center Column: Digital LED Timer, Controls & Match Events Feed */}
        <section className="w-full landscape:w-80 md:landscape:w-96 flex flex-col items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
          {/* Digital Timer */}
          <div className="flex flex-col items-center w-full">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400">
              Tempo de Jogo
            </span>
            <div className="my-1 font-mono text-4xl md:text-5xl font-black tracking-widest tabular-nums text-amber-300 drop-shadow-[0_0_20px_rgba(252,211,77,0.35)]">
              {formatTimer(elapsedSeconds)}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsRunning((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
                  isRunning
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                }`}
              >
                <span>{isRunning ? "⏸️ Pausar" : "▶️ Iniciar"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setElapsedSeconds(0);
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
                title="Reiniciar cronómetro"
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Goal Events Timeline Feed */}
          <div className="w-full my-3 flex-1 flex flex-col min-h-[90px] max-h-36 landscape:max-h-48 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>⚽ Histórico de Golos</span>
              <span className="tabular-nums font-mono text-slate-500">{goalEvents.length} golos</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pt-1.5 pr-1 scrollbar-thin">
              {goalEvents.length === 0 ? (
                <p className="text-center text-[11px] text-slate-500 py-4 italic">
                  À espera do primeiro golo da partida...
                </p>
              ) : (
                goalEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="flex items-center justify-between rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 py-1 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {evt.team === "shirts" ? "👕" : "🦺"}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {evt.team === "shirts" ? "Camisolas" : "Coletes"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-300">
                      ⏱️ {evt.timeLabel} ({evt.minute}')
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Finish Match Button */}
          <div className="w-full pt-2">
            {error && (
              <p className="mb-2 text-center text-xs text-rose-400 font-semibold">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs md:text-sm font-black text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition-all disabled:opacity-60"
            >
              <span>{submitting ? "A guardar jogo..." : "🏁 Terminar e Gravar Jogo"}</span>
            </button>
          </div>
        </section>

        {/* Right Column: Coletes (🦺) */}
        <section className="flex-1 flex flex-col items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-slate-900/60 to-slate-950 p-4 shadow-xl shadow-amber-950/20">
          <div className="flex items-center gap-2 text-amber-400 text-sm md:text-base font-black tracking-wider uppercase">
            <span className="text-xl md:text-2xl" aria-hidden>🦺</span>
            <span>Coletes</span>
          </div>

          <div className="my-2 md:my-auto flex flex-col items-center">
            <div className="font-mono text-7xl md:text-9xl font-black tabular-nums text-amber-200 drop-shadow-[0_0_25px_rgba(251,191,36,0.35)]">
              {coletesScore}
            </div>

            <div className="mt-2 md:mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => removeGoal("coletes")}
                disabled={coletesScore <= 0}
                className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-950/50 text-xl font-bold text-amber-200 hover:bg-amber-900/60 active:scale-90 disabled:opacity-30 transition-all"
                title="Anular golo"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => addGoal("coletes")}
                className="flex h-12 px-6 md:h-14 md:px-8 items-center justify-center gap-2 rounded-xl bg-amber-500 text-base md:text-lg font-black text-slate-950 shadow-lg shadow-amber-500/40 hover:bg-amber-400 active:scale-95 transition-all"
                title="Golo dos Coletes!"
              >
                <span>＋ GOLO</span>
              </button>
            </div>
          </div>

          {/* Lineup list */}
          <div className="w-full mt-2 pt-2 border-t border-amber-500/20">
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80 text-center mb-1">
              Plantel ({game.coletesLineup.length})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 max-h-16 md:max-h-24 overflow-y-auto scrollbar-none">
              {game.coletesLineup.map((p, i) => (
                <span
                  key={p.id ?? i}
                  className="rounded bg-amber-950/60 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200 truncate"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
