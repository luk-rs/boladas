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
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-3 select-none overflow-hidden">
      {/* App-shell aligned container (max-w-[430px] portrait "ao alto", matching the rest of the app) */}
      <div
        ref={containerRef}
        className="w-full max-w-[430px] h-full md:max-h-[860px] md:rounded-3xl border-x md:border border-slate-800 bg-slate-950 text-slate-100 flex flex-col shadow-2xl select-none overflow-hidden relative"
      >
        {/* Vuvuzela Checkpoint Toast */}
        {vuvuzelaToast && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-400 bg-amber-500/95 px-3.5 py-1 text-[11px] font-black text-slate-950 shadow-2xl shadow-amber-500/50 animate-bounce">
            <span>🎺</span>
            <span>CHECKPOINT: {Math.floor(elapsedSeconds / 60)} MIN! (VUVUZELA)</span>
          </div>
        )}

        {/* 1. Header Broadcast Bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2 truncate pr-1">
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              <span>DIRETO</span>
            </span>
            <div className="truncate">
              <h1 className="text-xs font-bold text-white truncate">
                {game.teamName}
              </h1>
              <p className="text-[9px] text-slate-400">
                {dateLabel} · {timeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-all active:scale-95 ${
                soundEnabled
                  ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                  : "border-slate-700 bg-slate-800 text-slate-400"
              }`}
              title={soundEnabled ? "Sons ativados (Apitos & Vuvuzela)" : "Sons desativados"}
            >
              <span>{soundEnabled ? "🔊 Som" : "🔇 Mudo"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </header>

        {/* 2. Main Pitch Area (Arranged "ao alto" in portrait, two teams side-by-side) */}
        <main className="flex-1 flex flex-col p-2.5 gap-2 min-h-0 overflow-hidden">
          {/* A. Digital Timer Header Row */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                Tempo
              </span>
              <div className="font-mono text-2xl font-black tracking-wider tabular-nums text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.35)]">
                {formatTimer(elapsedSeconds)}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTimer}
                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
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
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white active:scale-95"
                title="Reiniciar cronómetro"
              >
                ↺
              </button>
            </div>
          </div>

          {/* B. Scoreboard: Camisolas vs Coletes (Two teams facing each other side-by-side) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 shadow-lg">
            {/* Camisolas Side */}
            <div
              className={`flex flex-col items-center rounded-xl p-2 transition-all ${
                scorerPickerTeam === "shirts"
                  ? "bg-sky-950/80 ring-2 ring-sky-400 border border-sky-400"
                  : "bg-sky-950/30 border border-sky-500/20"
              }`}
            >
              <span className="text-[11px] font-black tracking-wider uppercase text-sky-400 flex items-center gap-1">
                <span>👕</span>
                <span>Camisolas</span>
              </span>
              <span className="font-mono text-4xl font-black tabular-nums text-sky-200 my-0.5">
                {shirtsScore}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) return;
                  setScorerPickerTeam((prev) => (prev === "shirts" ? null : "shirts"));
                }}
                disabled={!isRunning}
                className={`w-full py-1 px-2 rounded-lg text-xs font-black transition-all active:scale-95 ${
                  !isRunning
                    ? "opacity-35 cursor-not-allowed bg-slate-800 text-slate-500"
                    : scorerPickerTeam === "shirts"
                      ? "bg-sky-400 text-slate-950"
                      : "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30 hover:bg-sky-400"
                }`}
                title={
                  !isRunning
                    ? "Inicia o jogo para marcar golos"
                    : "Golo das Camisolas! (Selecionar marcador)"
                }
              >
                {scorerPickerTeam === "shirts" ? "A escolher..." : "＋ GOLO"}
              </button>
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                VS
              </span>
            </div>

            {/* Coletes Side */}
            <div
              className={`flex flex-col items-center rounded-xl p-2 transition-all ${
                scorerPickerTeam === "coletes"
                  ? "bg-amber-950/80 ring-2 ring-amber-400 border border-amber-400"
                  : "bg-amber-950/30 border border-amber-500/20"
              }`}
            >
              <span className="text-[11px] font-black tracking-wider uppercase text-amber-400 flex items-center gap-1">
                <span>🦺</span>
                <span>Coletes</span>
              </span>
              <span className="font-mono text-4xl font-black tabular-nums text-amber-200 my-0.5">
                {coletesScore}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!isRunning) return;
                  setScorerPickerTeam((prev) => (prev === "coletes" ? null : "coletes"));
                }}
                disabled={!isRunning}
                className={`w-full py-1 px-2 rounded-lg text-xs font-black transition-all active:scale-95 ${
                  !isRunning
                    ? "opacity-35 cursor-not-allowed bg-slate-800 text-slate-500"
                    : scorerPickerTeam === "coletes"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 hover:bg-amber-400"
                }`}
                title={
                  !isRunning
                    ? "Inicia o jogo para marcar golos"
                    : "Golo dos Coletes! (Selecionar marcador)"
                }
              >
                {scorerPickerTeam === "coletes" ? "A escolher..." : "＋ GOLO"}
              </button>
            </div>
          </div>

          {!isRunning && (
            <p className="text-center text-[10px] text-slate-400 italic -mt-1">
              Inicia o cronómetro para marcar golos
            </p>
          )}

          {/* C. Goal Selection Mode Action Banner */}
          {scorerPickerTeam && (
            <div className="flex items-center justify-between gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/80 px-2.5 py-1.5 animate-in fade-in zoom-in-95 shrink-0">
              <span className="text-[11px] font-black text-amber-300 truncate">
                ⚽ Golo {scorerPickerTeam === "shirts" ? "Camisolas" : "Coletes"}:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => addGoal(scorerPickerTeam, null)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 py-1 px-2 text-[10px] font-black text-slate-950 active:scale-95 transition-all shadow-sm"
                >
                  Sem marcador
                </button>
                <button
                  type="button"
                  onClick={() => setScorerPickerTeam(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 py-1 px-2 text-[10px] font-semibold text-slate-300 active:scale-95"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* D. Player Matrices: 2 Columns Side-by-Side (Camisolas on left, Coletes on right) */}
          <div className="flex-1 grid grid-cols-2 gap-2 min-h-[140px] max-h-56 overflow-hidden">
            {/* Camisolas Lineup Column */}
            <div className="flex flex-col rounded-xl border border-sky-500/20 bg-slate-900/60 p-2 min-h-0">
              <div className="flex items-center justify-between pb-1 border-b border-sky-500/20 text-[10px] font-bold text-sky-400">
                <span>👕 Plantel</span>
                <span className="text-[9px] font-mono opacity-80">{game.shirtsLineup.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pt-1.5 pr-0.5 scrollbar-thin">
                {game.shirtsLineup.map((p, i) => {
                  const count = playerGoalsCount[p.id ?? ""] || playerGoalsCount[p.name ?? ""] || 0;

                  // Selection: Camisolas scored
                  if (scorerPickerTeam === "shirts") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("shirts", p, false)}
                        className="w-full flex items-center justify-between gap-1 rounded-lg border border-sky-400 bg-sky-950/90 px-1.5 py-1 text-left text-[11px] font-semibold text-sky-100 hover:bg-sky-900 active:scale-95 transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-800 text-sky-200 text-[9px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded bg-sky-400 text-slate-950 px-1 py-0.2 text-[9px] font-black">
                          ＋
                        </span>
                      </button>
                    );
                  }

                  // Selection: Coletes scored, Camisolas player made own goal
                  if (scorerPickerTeam === "coletes") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("coletes", p, true)}
                        className="w-full flex items-center justify-between gap-1 rounded-lg border border-rose-500/50 bg-rose-950/40 px-1.5 py-1 text-left text-[11px] font-semibold text-rose-200 hover:bg-rose-900/60 active:scale-95 transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-900 text-rose-200 text-[9px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded bg-rose-600 text-white px-1 py-0.2 text-[9px] font-black">
                          AG
                        </span>
                      </button>
                    );
                  }

                  // Normal mode
                  return (
                    <div
                      key={p.id ?? i}
                      className="flex items-center justify-between gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-1.5 py-1 text-left text-[11px] text-slate-200"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-950 text-sky-300 border border-sky-800/80 text-[9px] font-bold">
                          {getInitials(p.name)}
                        </span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 rounded-full bg-sky-500 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                          ⚽ {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coletes Lineup Column */}
            <div className="flex flex-col rounded-xl border border-amber-500/20 bg-slate-900/60 p-2 min-h-0">
              <div className="flex items-center justify-between pb-1 border-b border-amber-500/20 text-[10px] font-bold text-amber-400">
                <span>🦺 Plantel</span>
                <span className="text-[9px] font-mono opacity-80">{game.coletesLineup.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pt-1.5 pr-0.5 scrollbar-thin">
                {game.coletesLineup.map((p, i) => {
                  const count = playerGoalsCount[p.id ?? ""] || playerGoalsCount[p.name ?? ""] || 0;

                  // Selection: Coletes scored
                  if (scorerPickerTeam === "coletes") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("coletes", p, false)}
                        className="w-full flex items-center justify-between gap-1 rounded-lg border border-amber-400 bg-amber-950/90 px-1.5 py-1 text-left text-[11px] font-semibold text-amber-100 hover:bg-amber-900 active:scale-95 transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-amber-200 text-[9px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded bg-amber-400 text-slate-950 px-1 py-0.2 text-[9px] font-black">
                          ＋
                        </span>
                      </button>
                    );
                  }

                  // Selection: Camisolas scored, Coletes player made own goal
                  if (scorerPickerTeam === "shirts") {
                    return (
                      <button
                        key={p.id ?? i}
                        type="button"
                        onClick={() => addGoal("shirts", p, true)}
                        className="w-full flex items-center justify-between gap-1 rounded-lg border border-rose-500/50 bg-rose-950/40 px-1.5 py-1 text-left text-[11px] font-semibold text-rose-200 hover:bg-rose-900/60 active:scale-95 transition-all shadow-sm group"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-900 text-rose-200 text-[9px] font-black">
                            {getInitials(p.name)}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="shrink-0 rounded bg-rose-600 text-white px-1 py-0.2 text-[9px] font-black">
                          AG
                        </span>
                      </button>
                    );
                  }

                  // Normal mode
                  return (
                    <div
                      key={p.id ?? i}
                      className="flex items-center justify-between gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-1.5 py-1 text-left text-[11px] text-slate-200"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 text-[9px] font-bold">
                          {getInitials(p.name)}
                        </span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                          ⚽ {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* E. Goal Events Timeline Feed (Recentes no topo) */}
          <div className="flex-1 flex flex-col min-h-[90px] max-h-36 rounded-xl border border-slate-800 bg-slate-900/80 p-2 overflow-hidden">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <span>⚽ Histórico de Golos (Recentes no topo)</span>
              <span className="tabular-nums font-mono text-slate-500">{goalEvents.length} golos</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pt-1 pr-0.5 scrollbar-thin">
              {reversedGoalEvents.length === 0 ? (
                <p className="text-center text-[10px] text-slate-500 py-3 italic">
                  À espera do primeiro golo da partida...
                </p>
              ) : (
                reversedGoalEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950/80 border border-slate-800/80 px-2 py-0.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate pr-1">
                      <span className="text-xs shrink-0">
                        {evt.team === "shirts" ? "👕" : "🦺"}
                      </span>
                      <span className="font-semibold text-slate-200 truncate text-[11px]">
                        {evt.playerName ?? (evt.team === "shirts" ? "Camisolas" : "Coletes")}
                      </span>
                      {evt.isOwnGoal && (
                        <span className="rounded bg-rose-500/20 border border-rose-500/40 text-[8px] text-rose-300 px-1 py-0.1 font-bold uppercase">
                          AG
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] font-bold text-amber-300">
                        ⏱️ {evt.timeLabel} ({evt.minute}')
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGoalById(evt.id)}
                        className="text-slate-500 hover:text-rose-400 text-xs px-0.5 font-bold"
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

          {/* F. Terminar Jogo Button */}
          <div className="pt-0.5 shrink-0">
            {error && (
              <p className="mb-1 text-center text-xs text-rose-400 font-semibold">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 px-3 text-xs font-black text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 active:scale-98 transition-all disabled:opacity-60"
            >
              <span>{submitting ? "A guardar jogo..." : "🏁 Terminar e Gravar Jogo"}</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
