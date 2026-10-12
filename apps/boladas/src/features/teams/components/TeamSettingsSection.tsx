import { useEffect, useState } from "react";
import { BottomSheet } from "../../../shared/ui/BottomSheet";
import { WheelDayOfWeekPicker } from "../../../shared/ui/WheelDayOfWeekPicker";
import { WheelTimePicker } from "../../../shared/ui/WheelTimePicker";
import { WheelDatePicker } from "../../../shared/ui/WheelDatePicker";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import {
  fetchTeamSettings,
  updateTeamSettings,
} from "../services/team-management.service";

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

type TeamSettingsSectionProps = {
  teamId: string;
  onTeamUpdated?: (newName: string) => void;
};

export function TeamSettingsSection({
  teamId,
  onTeamUpdated,
}: TeamSettingsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("19:00");
  const [seasonStart, setSeasonStart] = useState("");
  const [holidayStart, setHolidayStart] = useState("");

  const [activePicker, setActivePicker] = useState<
    "day" | "time" | "season" | "holiday" | null
  >(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccess(false);

    fetchTeamSettings(teamId).then((result) => {
      if (!isMounted) return;
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTeamName(result.data.name);
        setSeasonStart(result.data.seasonStart || "");
        setHolidayStart(result.data.holidayStart || "");
        const firstDef = result.data.gameDefinitions[0];
        if (firstDef) {
          setDayOfWeek(firstDef.dayOfWeek);
          setStartTime(firstDef.startTime);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [teamId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("O nome da equipa não pode ficar vazio.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateTeamSettings({
      teamId,
      name: teamName.trim(),
      seasonStart: seasonStart || null,
      holidayStart: holidayStart || null,
      gameDefinitions: [{ dayOfWeek, startTime }],
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      if (onTeamUpdated) onTeamUpdated(teamName.trim());
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
        <header className="mb-3">
          <p className="ui-section-title">Definições da equipa</p>
        </header>
        <p className="text-xs text-[var(--text-secondary)]">A carregar definições...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
      <header className="mb-3">
        <p className="ui-section-title">Definições da equipa</p>
      </header>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Nome da equipa
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:border-primary-500 focus:outline-none"
            placeholder="Nome da equipa"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
            Jogo habitual (horário padrão)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActivePicker("day")}
              className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              <span>{DAY_LABELS[dayOfWeek]}</span>
              <span className="text-base text-[var(--text-secondary)]">📅</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePicker("time")}
              className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              <span>{startTime}</span>
              <span className="text-base text-[var(--text-secondary)]">🕘</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Início de época
            </label>
            <button
              type="button"
              onClick={() => setActivePicker("season")}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              <span className="truncate">{seasonStart || "Não definido"}</span>
              <span className="text-sm text-[var(--text-secondary)]">🗓️</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-1">
              Início de férias
            </label>
            <button
              type="button"
              onClick={() => setActivePicker("holiday")}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              <span className="truncate">{holidayStart || "Não definido"}</span>
              <span className="text-sm text-[var(--text-secondary)]">🏖️</span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
        {success && (
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ✓ Definições da equipa atualizadas com sucesso!
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-60"
          >
            {saving ? "A guardar..." : "Guardar definições"}
          </button>
        </div>
      </form>

      {/* Pickers */}
      <BottomSheet
        open={activePicker === "day"}
        title="Escolher Dia da Semana"
        onClose={() => setActivePicker(null)}
        onConfirm={() => setActivePicker(null)}
      >
        <WheelDayOfWeekPicker value={dayOfWeek} onChange={setDayOfWeek} />
      </BottomSheet>

      <BottomSheet
        open={activePicker === "time"}
        title="Escolher Hora do Jogo"
        onClose={() => setActivePicker(null)}
        onConfirm={() => setActivePicker(null)}
      >
        <WheelTimePicker value={startTime} onChange={setStartTime} />
      </BottomSheet>

      <BottomSheet
        open={activePicker === "season"}
        title="Início de Época"
        onClose={() => setActivePicker(null)}
        onConfirm={() => setActivePicker(null)}
      >
        <WheelDatePicker
          value={seasonStart || new Date().toISOString().split("T")[0]}
          onChange={setSeasonStart}
        />
      </BottomSheet>

      <BottomSheet
        open={activePicker === "holiday"}
        title="Início de Férias"
        onClose={() => setActivePicker(null)}
        onConfirm={() => setActivePicker(null)}
      >
        <WheelDatePicker
          value={holidayStart || new Date().toISOString().split("T")[0]}
          onChange={setHolidayStart}
        />
      </BottomSheet>
    </section>
  );
}
