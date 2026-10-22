import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, GameLineupPlayer, GameResultScores, GoalEvent } from "../types";
import { formatSchedule } from "../utils";
import {
  playVuvuzela,
  playWhistleEnd,
  playWhistlePause,
  playWhistleStart,
} from "../utils/soundEffects";

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

function getInitials(name?: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const [scorerPickerTeam, setScorerPickerTeam] = useState<"shirts" | "coletes" | null>(null);
  const [vuvuzelaToast, setVuvuzelaToast] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("boladas_sound_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastVuvuzelaSecondRef = useRef<number>(-1);
  const storageKey = game ? `boladas_live_match_${game.id}` : null;

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("boladas_sound_enabled", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

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

  // Vuvuzela sound every 2 minutes (120s, 240s, 360s, ...)
  useEffect(() => {
    if (!isRunning) return;
    if (
      elapsedSeconds > 0 &&
      elapsedSeconds % 120 === 0 &&
      lastVuvuzelaSecondRef.current !== elapsedSeconds
    ) {
      lastVuvuzelaSecondRef.current = elapsedSeconds;
      if (soundEnabled) {
        playVuvuzela();
      }
      setVuvuzelaToast(true);
      const timer = window.setTimeout(() => setVuvuzelaToast(false), 3500);
      return () => window.clearTimeout(timer);
    }
  }, [elapsedSeconds, isRunning, soundEnabled]);

  // Track fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Compute goal counts per player
  const playerGoalsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const evt of goalEvents) {
      if (evt.isOwnGoal) continue;
      if (evt.playerId) {
        counts[evt.playerId] = (counts[evt.playerId] || 0) + 1;
      } else if (evt.playerName) {
        counts[evt.playerName] = (counts[evt.playerName] || 0) + 1;
      }
    }
    return counts;
  }, [goalEvents]);

  // Goal events ordered with newest on top (most recent first)
  const reversedGoalEvents = useMemo(() => [...goalEvents].reverse(), [goalEvents]);

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

  const toggleTimer = () => {
    setIsRunning((prev) => {
      const next = !prev;
      if (soundEnabled) {
        if (next) {
          playWhistleStart();
        } else {
          playWhistlePause();
        }
      }
      if (!next) {
        // Cancel any active goal picker when pausing
        setScorerPickerTeam(null);
      }
      return next;
    });
  };

  const addGoal = (
    team: "shirts" | "coletes",
    player?: GameLineupPlayer | null,
    isOwnGoal?: boolean,
  ) => {
    if (!isRunning) return;

    const minute = Math.floor(elapsedSeconds / 60) + 1;
    const timeLabel = formatTimer(elapsedSeconds);
    const displayName = player?.name
      ? isOwnGoal
        ? `${player.name} (AG)`
        : player.name
      : undefined;

    const newGoal: GoalEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      team,
      elapsedSeconds,
      timeLabel,
      minute,
      playerId: player?.id,
      playerName: displayName,
      isOwnGoal,
    };

    if (team === "shirts") {
      setShirtsScore((s) => s + 1);
    } else {
      setColetesScore((s) => s + 1);
    }
    setGoalEvents((prev) => [...prev, newGoal]);
    setScorerPickerTeam(null);
  };

  const removeGoalById = (goalId: string) => {
    const goal = goalEvents.find((g) => g.id === goalId);
    if (!goal) return;

    if (goal.team === "shirts") {
      setShirtsScore((s) => Math.max(0, s - 1));
    } else {
      setColetesScore((s) => Math.max(0, s - 1));
    }
    setGoalEvents((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleFinish = async () => {
    if (soundEnabled) {
      playWhistleEnd();
    }
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 md:p-4 lg:p-6 select-none overflow-hidden">
      {/* Framed Landscape Player (Scales cleanly in desktop browser; edge-to-edge when fullscreen) */}
      <div
        ref={containerRef}
        className={`w-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden transition-all duration-200 relative ${
          isFullscreen
            ? "fixed inset-0 z-[160] rounded-none border-0 h-full w-full"
            : "max-w-5xl h-full max-h-[720px] rounded-3xl border border-slate-800 shadow-2xl shadow-black/80"
        }`}
      >
        {/* Vuvuzela Checkpoint Banner */}
        {vuvuzelaToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-400 bg-amber-500/95 px-4 py-1.5 text-xs font-black text-slate-950 shadow-2xl shadow-amber-500/50 animate-bounce">
            <span className="text-base">🎺</span>
            <span>CHECKPOINT: {Math.floor(elapsedSeconds / 60)} MINUTOS! (VUVUZELA)</span>
          </div>
        )}

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
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-95 ${
                soundEnabled
                  ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title={soundEnabled ? "Sons ativados (Apitos & Vuvuzela)" : "Sons desativados"}
            >
              <span>{soundEnabled ? "🔊 Som Ativo" : "🔇 Silêncio"}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
              title="Alternar Ecrã Inteiro / Janela"
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

        {/* Main Pitch Arena */}
        <main className="flex-1 flex flex-col landscape:flex-row items-stretch justify-between p-3 md:p-4 gap-3 md:gap-4 min-h-0 overflow-y-auto landscape:overflow-hidden">
          {/* Left Column: Camisolas (👕) */}
          <section
            className={`flex-1 flex flex-col justify-between rounded-2xl border p-3.5 transition-all shadow-xl min-h-0 ${
              scorerPickerTeam === "shirts"
                ? "border-sky-400 bg-sky-950/60 shadow-sky-500/20 ring-2 ring-sky-500/50"
                : scorerPickerTeam === "coletes"
                  ? "border-amber-500/40 bg-slate-900/90"
                  : "border-sky-500/30 bg-gradient-to-b from-sky-950/40 via-slate-900/60 to-slate-950"
            }`}
          >
            {/* Team Header & Score */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-sky-400 text-sm font-black tracking-wider uppercase">
                <span className="text-xl" aria-hidden>👕</span>
                <span>Camisolas</span>
              </div>

              <div className="my-1 font-mono text-6xl md:text-7xl font-black tabular-nums text-sky-200 drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                {shirtsScore}
              </div>

              {/* Goal Trigger Button (Only enabled when match is running) */}
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) return;
                  setScorerPickerTeam((prev) => (prev === "shirts" ? null : "shirts"));
                }}
                disabled={!isRunning}
                className={`flex h-10 px-6 items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${
                  !isRunning
                    ? "opacity-35 cursor-not-allowed bg-slate-800 text-slate-400 border border-slate-700"
                    : scorerPickerTeam === "shirts"
                      ? "bg-sky-400 text-slate-950 ring-4 ring-sky-400/40"
                      : "bg-sky-500 text-slate-950 shadow-sky-500/30 hover:bg-sky-400"
                }`}
                title={
                  !isRunning
                    ? "Inicia o jogo para marcar golos"
                    : "Golo das Camisolas! (Selecionar marcador)"
                }
              >
                <span>{scorerPickerTeam === "shirts" ? "✓ A selecionar marcador" : "＋ GOLO"}</span>
              </button>

              {!isRunning && (
                <span className="mt-1 text-[10px] text-slate-400 italic">
                  Inicia o jogo para marcar golos
                </span>
              )}
            </div>

            {/* Players Matrix / Grid (Two modes: Normal Counters vs Selection) */}
            <div className="w-full mt-2 pt-2 border-t border-sky-500/20 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-sky-400/90">
                  {scorerPickerTeam === "shirts"
                    ? "⚽ Quem marcou o golo?"
                    : scorerPickerTeam === "coletes"
                      ? "⚠️ Quem fez o autogolo?"
                      : "Plantel & Golos"}
                </p>
                <span className="text-[10px] text-sky-400/60 font-mono">
                  {game.shirtsLineup.length} jogadores
                </span>
              </div>

              <div className="flex-1 grid grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin max-h-52 md:max-h-64">
                {game.shirtsLineup.map((p, i) => {
                  const count = playerGoalsCount[p.id ?? ""] || playerGoalsCount[p.name ?? ""] || 0;

                  // Selection mode: Camisolas scored
                  if (scorerPickerTeam === "shirts") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("shirts", p, false)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-sky-400 bg-sky-950/90 px-2.5 py-1.5 text-left text-xs font-semibold text-sky-100 hover:bg-sky-900 active:scale-95 transition-all shadow-md group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-800 text-sky-200 text-[10px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-md bg-sky-400 text-slate-950 px-2 py-0.5 text-[10px] font-black">
                          Marcou ＋
                        </span>
                      </button>
                    );
                  }

                  // Selection mode: Coletes scored, Camisolas player made own goal
                  if (scorerPickerTeam === "coletes") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("coletes", p, true)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-2.5 py-1.5 text-left text-xs font-semibold text-rose-200 hover:bg-rose-900/60 hover:border-rose-400 active:scale-95 transition-all shadow-md group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-900 text-rose-200 text-[10px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-md bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black">
                          Autogolo
                        </span>
                      </button>
                    );
                  }

                  // Normal mode: display avatar, name and goal count
                  return (
                    <div
                      key={p.id ?? i}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-950 text-sky-300 border border-sky-800/80 text-[10px] font-bold">
                          {getInitials(p.name)}
                        </span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 rounded-full bg-sky-500 text-slate-950 px-2 py-0.5 text-[10px] font-black">
                          ⚽ {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Center Column: Digital LED Timer, Controls & Match Events Feed */}
          <section className="w-full landscape:w-80 md:landscape:w-96 flex flex-col items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-xl min-h-0">
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
                  onClick={toggleTimer}
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
                    setScorerPickerTeam(null);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
                  title="Reiniciar cronómetro"
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            {/* Goal Registration Center Action Banner (Points 3 & 4) */}
            {scorerPickerTeam && (
              <div className="w-full my-2.5 flex flex-col items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/70 p-2.5 animate-in fade-in zoom-in-95">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>⚽</span>
                  <span>Golo {scorerPickerTeam === "shirts" ? "das Camisolas" : "dos Coletes"}</span>
                </span>
                <p className="text-[11px] text-slate-300 text-center">
                  Toque no marcador ou confirme golo sem marcador:
                </p>
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => addGoal(scorerPickerTeam, null)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-1.5 px-2 text-xs font-black text-slate-950 active:scale-95 transition-all shadow-md"
                  >
                    <span>⚽ Golo sem marcador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScorerPickerTeam(null)}
                    className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 py-1.5 px-3 text-xs font-semibold text-slate-300 active:scale-95 transition-all"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Goal Events Timeline Feed (Point 2: Newest on TOP) */}
            <div className="w-full my-2 flex-1 flex flex-col min-h-[110px] max-h-36 landscape:max-h-48 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>⚽ Histórico de Golos (Recentes no topo)</span>
                <span className="tabular-nums font-mono text-slate-500">{goalEvents.length} golos</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pt-1.5 pr-1 scrollbar-thin">
                {reversedGoalEvents.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-500 py-4 italic">
                    À espera do primeiro golo da partida...
                  </p>
                ) : (
                  reversedGoalEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/90 border border-slate-800 px-2.5 py-1 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="text-sm shrink-0">
                          {evt.team === "shirts" ? "👕" : "🦺"}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {evt.playerName ?? (evt.team === "shirts" ? "Camisolas" : "Coletes")}
                        </span>
                        {evt.isOwnGoal && (
                          <span className="rounded bg-rose-500/20 border border-rose-500/40 text-[9px] text-rose-300 px-1 py-0.2 font-bold uppercase">
                            AG
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-amber-300">
                          ⏱️ {evt.timeLabel} ({evt.minute}')
                        </span>
                        {/* Point 4: Removal strictly from history panel */}
                        <button
                          type="button"
                          onClick={() => removeGoalById(evt.id)}
                          className="text-slate-500 hover:text-rose-400 text-xs px-1 font-bold"
                          title="Anular este golo"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Finish Match Button */}
            <div className="w-full pt-1">
              {error && (
                <p className="mb-2 text-center text-xs text-rose-400 font-semibold">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs md:text-sm font-black text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition-all disabled:opacity-60"
              >
                <span>{submitting ? "A guardar jogo..." : "🏁 Terminar e Gravar Jogo"}</span>
              </button>
            </div>
          </section>

          {/* Right Column: Coletes (🦺) */}
          <section
            className={`flex-1 flex flex-col justify-between rounded-2xl border p-3.5 transition-all shadow-xl min-h-0 ${
              scorerPickerTeam === "coletes"
                ? "border-amber-400 bg-amber-950/60 shadow-amber-500/20 ring-2 ring-amber-500/50"
                : scorerPickerTeam === "shirts"
                  ? "border-sky-500/40 bg-slate-900/90"
                  : "border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-slate-900/60 to-slate-950"
            }`}
          >
            {/* Team Header & Score */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-black tracking-wider uppercase">
                <span className="text-xl" aria-hidden>🦺</span>
                <span>Coletes</span>
              </div>

              <div className="my-1 font-mono text-6xl md:text-7xl font-black tabular-nums text-amber-200 drop-shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                {coletesScore}
              </div>

              {/* Goal Trigger Button (Only enabled when match is running) */}
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) return;
                  setScorerPickerTeam((prev) => (prev === "coletes" ? null : "coletes"));
                }}
                disabled={!isRunning}
                className={`flex h-10 px-6 items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all shadow-lg active:scale-95 ${
                  !isRunning
                    ? "opacity-35 cursor-not-allowed bg-slate-800 text-slate-400 border border-slate-700"
                    : scorerPickerTeam === "coletes"
                      ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/40"
                      : "bg-amber-500 text-slate-950 shadow-amber-500/30 hover:bg-amber-400"
                }`}
                title={
                  !isRunning
                    ? "Inicia o jogo para marcar golos"
                    : "Golo dos Coletes! (Selecionar marcador)"
                }
              >
                <span>{scorerPickerTeam === "coletes" ? "✓ A selecionar marcador" : "＋ GOLO"}</span>
              </button>

              {!isRunning && (
                <span className="mt-1 text-[10px] text-slate-400 italic">
                  Inicia o jogo para marcar golos
                </span>
              )}
            </div>

            {/* Players Matrix / Grid (Two modes: Normal Counters vs Selection) */}
            <div className="w-full mt-2 pt-2 border-t border-amber-500/20 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/90">
                  {scorerPickerTeam === "coletes"
                    ? "⚽ Quem marcou o golo?"
                    : scorerPickerTeam === "shirts"
                      ? "⚠️ Quem fez o autogolo?"
                      : "Plantel & Golos"}
                </p>
                <span className="text-[10px] text-amber-400/60 font-mono">
                  {game.coletesLineup.length} jogadores
                </span>
              </div>

              <div className="flex-1 grid grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 scrollbar-thin max-h-52 md:max-h-64">
                {game.coletesLineup.map((p, i) => {
                  const count = playerGoalsCount[p.id ?? ""] || playerGoalsCount[p.name ?? ""] || 0;

                  // Selection mode: Coletes scored
                  if (scorerPickerTeam === "coletes") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("coletes", p, false)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-amber-400 bg-amber-950/90 px-2.5 py-1.5 text-left text-xs font-semibold text-amber-100 hover:bg-amber-900 active:scale-95 transition-all shadow-md group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-800 text-amber-200 text-[10px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-md bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black">
                          Marcou ＋
                        </span>
                      </button>
                    );
                  }

                  // Selection mode: Camisolas scored, Coletes player made own goal
                  if (scorerPickerTeam === "shirts") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("shirts", p, true)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-2.5 py-1.5 text-left text-xs font-semibold text-rose-200 hover:bg-rose-900/60 hover:border-rose-400 active:scale-95 transition-all shadow-md group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-900 text-rose-200 text-[10px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded-md bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black">
                          Autogolo
                        </span>
                      </button>
                    );
                  }

                  // Normal mode: display avatar, name and goal count
                  return (
                    <div
                      key={p.id ?? i}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-left text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 text-[10px] font-bold">
                          {getInitials(p.name)}
                        </span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-black">
                          ⚽ {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
