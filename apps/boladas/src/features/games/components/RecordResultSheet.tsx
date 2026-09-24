import { FormEvent, useEffect, useId, useState } from "react";
import type { Game, GameResultScores } from "../types";
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;
    setShirts(scoreInputValue(game.shirtsScore));
    setColetes(scoreInputValue(game.coletesScore));
    setFormError(null);
  }, [game]);

  if (!game) return null;

  const { dateLabel, timeLabel } = formatSchedule(game.scheduledAt);

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

    const error = await onSubmit({
      shirtsScore: parsedShirts.value,
      coletesScore: parsedColetes.value,
    });
    if (error) setFormError(error);
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        aria-label="Fechar"
        onClick={onClose}
        disabled={submitting}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[450px] animate-in rounded-t-3xl bg-[var(--bg-app)] p-6 shadow-2xl slide-in-from-bottom duration-300">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Registar resultado
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {game.teamName} · {dateLabel} · {timeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] active:scale-95 disabled:opacity-60"
          >
            Fechar
          </button>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {game.status === "completed" && (
            <p className="text-xs text-[var(--text-secondary)]">
              Podes corrigir o resultado. A data em que foi registado mantém-se.
            </p>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <label htmlFor={shirtsId} className="space-y-2">
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
            <label htmlFor={coletesId} className="space-y-2">
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
