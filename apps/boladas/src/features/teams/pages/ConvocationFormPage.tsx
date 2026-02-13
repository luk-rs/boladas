import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WheelDatePicker } from "../../../components/ui/WheelDatePicker";
import { WheelTimePicker } from "../../../components/ui/WheelTimePicker";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { supabase } from "../../../lib/supabase";
import { MANAGER_ROLES, MIN_TEAM_MEMBERS } from "../dashboard/constants";
import { useTeams } from "../useTeams";

type ActivePicker = "team" | "definition" | "date" | "time" | null;
type ScheduleMode = "definition" | "custom";

type GameDefinition = {
  dayOfWeek: number;
  startTime: string;
};

type GameDefinitionOption = {
  id: string;
  definition: GameDefinition;
  label: string;
  nextOccurrenceLabel: string;
  nextSlot: { dateValue: string; timeValue: string } | null;
};

type TeamSchedule = {
  id: string;
  name: string;
  seasonStart: string | null;
  holidayStart: string | null;
  gameDefinitions: GameDefinition[];
  memberCount: number;
  isComplete: boolean;
};

const RETURN_TO_PROFILE_URL = "/profile?tab=convocations";
const DEFAULT_TIME = "19:00";
const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function getDefinitionId(definition: GameDefinition) {
  return `${definition.dayOfWeek}:${definition.startTime}`;
}

function toIsoDateLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(isoDate: string) {
  if (!isoDate) return "dd/mm/aaaa";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "dd/mm/aaaa";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseTime(startTime: string) {
  const match = startTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return { hours, minutes };
}

function parseGameDefinitions(raw: unknown): GameDefinition[] {
  if (!Array.isArray(raw)) return [];
  const defs: GameDefinition[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { dayOfWeek?: unknown; startTime?: unknown };
    const dayOfWeek = Number(record.dayOfWeek);
    const startTime =
      typeof record.startTime === "string" ? record.startTime.trim() : "";

    if (
      !Number.isNaN(dayOfWeek) &&
      dayOfWeek >= 0 &&
      dayOfWeek <= 6 &&
      parseTime(startTime)
    ) {
      defs.push({ dayOfWeek, startTime });
    }
  }

  return defs;
}

function computeNextOccurrence(
  dayOfWeek: number,
  startTime: string,
  reference: Date,
) {
  const parsedTime = parseTime(startTime);
  if (!parsedTime) return null;

  const candidate = new Date(reference);
  const daysAhead = (dayOfWeek - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + daysAhead);
  candidate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

  if (candidate.getTime() <= reference.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}

function computeNextSlotForDefinition(
  team: TeamSchedule,
  definition: GameDefinition,
) {
  const now = new Date();
  let reference = new Date(now);
  if (team.seasonStart) {
    const seasonStart = new Date(`${team.seasonStart}T00:00:00`);
    if (
      !Number.isNaN(seasonStart.getTime()) &&
      seasonStart.getTime() > reference.getTime()
    ) {
      reference = seasonStart;
    }
  }

  const next = computeNextOccurrence(
    definition.dayOfWeek,
    definition.startTime,
    reference,
  );
  if (!next) return null;

  const holidayStart = team.holidayStart
    ? new Date(`${team.holidayStart}T00:00:00`)
    : null;
  if (
    holidayStart &&
    !Number.isNaN(holidayStart.getTime()) &&
    next.getTime() >= holidayStart.getTime()
  ) {
    return null;
  }

  return {
    dateValue: toIsoDateLocal(next),
    timeValue: `${String(next.getHours()).padStart(2, "0")}:${String(
      next.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

function buildDefinitionOptions(team: TeamSchedule): GameDefinitionOption[] {
  return team.gameDefinitions
    .map((definition) => {
      const nextSlot = computeNextSlotForDefinition(team, definition);
      const dayLabel = DAY_LABELS[definition.dayOfWeek] ?? "Dia";
      return {
        id: getDefinitionId(definition),
        definition,
        nextSlot,
        label: `${dayLabel} ${definition.startTime}`,
        nextOccurrenceLabel: nextSlot
          ? `${formatDateLabel(nextSlot.dateValue)} ${nextSlot.timeValue}`
          : "Sem ocorrência futura disponível",
      };
    })
    .sort((a, b) => {
      if (a.nextSlot && b.nextSlot) {
        return (
          new Date(`${a.nextSlot.dateValue}T${a.nextSlot.timeValue}:00`).getTime() -
          new Date(`${b.nextSlot.dateValue}T${b.nextSlot.timeValue}:00`).getTime()
        );
      }
      if (a.nextSlot) return -1;
      if (b.nextSlot) return 1;
      return a.label.localeCompare(b.label, "pt-PT", { sensitivity: "base" });
    });
}

function buildScheduledAtIso(dateValue: string, timeValue: string) {
  const parsedTime = parseTime(timeValue);
  if (!parsedTime || !dateValue) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  return date.toISOString();
}

function buildGameDefinitionKey(
  team: TeamSchedule,
  dateValue: string,
  timeValue: string,
  preferredDefinitionId?: string | null,
) {
  if (preferredDefinitionId) {
    const preferredDefinition = team.gameDefinitions.find(
      (definition) => getDefinitionId(definition) === preferredDefinitionId,
    );
    if (preferredDefinition) {
      return `def:${preferredDefinition.dayOfWeek}:${preferredDefinition.startTime}`;
    }
  }

  const parsedTime = parseTime(timeValue);
  if (!parsedTime) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const normalizedTime = `${String(parsedTime.hours).padStart(2, "0")}:${String(
    parsedTime.minutes,
  ).padStart(2, "0")}`;
  const dayOfWeek = date.getDay();
  const matchingDefinition = team.gameDefinitions.find(
    (definition) =>
      definition.dayOfWeek === dayOfWeek &&
      definition.startTime === normalizedTime,
  );

  if (matchingDefinition) {
    return `def:${matchingDefinition.dayOfWeek}:${matchingDefinition.startTime}`;
  }

  return `adhoc:${dateValue}:${normalizedTime}`;
}

export function ConvocationFormPage() {
  const navigate = useNavigate();
  const { memberships, loading: membershipsLoading } = useTeams();

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("custom");
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [dateValue, setDateValue] = useState(toIsoDateLocal(new Date()));
  const [timeValue, setTimeValue] = useState(DEFAULT_TIME);
  const [teamScheduleById, setTeamScheduleById] = useState<
    Record<string, TeamSchedule>
  >({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [actionState, setActionState] = useState<"idle" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);

  const manageableMemberships = useMemo(
    () =>
      memberships.filter((membership) =>
        membership.roles.some((role) => MANAGER_ROLES.has(role)),
      ),
    [memberships],
  );

  const completeManageableMemberships = useMemo(
    () =>
      manageableMemberships.filter(
        (membership) => teamScheduleById[membership.teamId]?.isComplete,
      ),
    [manageableMemberships, teamScheduleById],
  );

  const hasCompleteManageableTeam = completeManageableMemberships.length > 0;

  useEffect(() => {
    if (manageableMemberships.length === 0) {
      setSelectedTeamId("");
      return;
    }

    if (completeManageableMemberships.length === 0) {
      setSelectedTeamId("");
      return;
    }

    const hasSelectedTeam = completeManageableMemberships.some(
      (membership) => membership.teamId === selectedTeamId,
    );
    if (!hasSelectedTeam) {
      setSelectedTeamId(completeManageableMemberships[0].teamId);
    }
  }, [completeManageableMemberships, manageableMemberships, selectedTeamId]);

  useEffect(() => {
    if (!supabase || manageableMemberships.length === 0) {
      setTeamScheduleById({});
      setLoadingSchedules(false);
      return;
    }

    const db = supabase;
    let isMounted = true;

    const loadTeamSchedules = async () => {
      setLoadingSchedules(true);
      const teamIds = manageableMemberships.map((membership) => membership.teamId);

      let rows:
        | Array<{
            id: string;
            name: string;
            season_start?: string | null;
            holiday_start?: string | null;
            game_definitions?: unknown;
          }>
        | null = null;

      let fetchError: string | null = null;
      let memberRows: Array<{ team_id: string }> = [];

      const {
        data: fullData,
        error: fullError,
      } = await db
        .from("teams")
        .select("id, name, season_start, holiday_start, game_definitions")
        .in("id", teamIds);

      if (fullError) {
        const { data: fallbackData, error: fallbackError } = await db
          .from("teams")
          .select("id, name")
          .in("id", teamIds);
        if (fallbackError) {
          fetchError = fallbackError.message;
        } else {
          rows = (fallbackData ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            season_start: null,
            holiday_start: null,
            game_definitions: [],
          }));
        }
      } else {
        rows = fullData ?? [];
      }

      const { data: membersData, error: membersError } = await db
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds);

      if (membersError) {
        fetchError = fetchError ?? membersError.message;
      } else {
        memberRows = membersData ?? [];
      }

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError);
        setLoadingSchedules(false);
        return;
      }

      const byId: Record<string, TeamSchedule> = {};
      const memberCountByTeamId = new Map<string, number>();

      teamIds.forEach((teamId) => memberCountByTeamId.set(teamId, 0));
      memberRows.forEach((row) => {
        memberCountByTeamId.set(
          row.team_id,
          (memberCountByTeamId.get(row.team_id) ?? 0) + 1,
        );
      });

      manageableMemberships.forEach((membership) => {
        const row = rows?.find((candidate) => candidate.id === membership.teamId);
        const memberCount = memberCountByTeamId.get(membership.teamId) ?? 0;
        byId[membership.teamId] = {
          id: membership.teamId,
          name: row?.name ?? membership.teamName,
          seasonStart: row?.season_start ?? null,
          holidayStart: row?.holiday_start ?? null,
          gameDefinitions: parseGameDefinitions(row?.game_definitions),
          memberCount,
          isComplete: memberCount >= MIN_TEAM_MEMBERS,
        };
      });

      setTeamScheduleById(byId);
      setLoadingSchedules(false);
    };

    void loadTeamSchedules();
    return () => {
      isMounted = false;
    };
  }, [manageableMemberships]);

  const selectedTeam = selectedTeamId ? teamScheduleById[selectedTeamId] : null;
  const definitionOptions = useMemo(
    () => (selectedTeam ? buildDefinitionOptions(selectedTeam) : []),
    [selectedTeam],
  );
  const selectedDefinitionOption = definitionOptions.find(
    (option) => option.id === selectedDefinitionId,
  );

  useEffect(() => {
    if (!selectedTeam) return;

    if (selectedTeam.gameDefinitions.length > 0) {
      const options = buildDefinitionOptions(selectedTeam);
      const firstOption = options[0];
      if (firstOption) {
        setScheduleMode("definition");
        setSelectedDefinitionId(firstOption.id);
        if (firstOption.nextSlot) {
          setDateValue(firstOption.nextSlot.dateValue);
          setTimeValue(firstOption.nextSlot.timeValue);
        } else {
          setTimeValue(firstOption.definition.startTime);
        }
      }
      return;
    }

    setScheduleMode("custom");
    setSelectedDefinitionId("");
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    setDateValue(toIsoDateLocal(fallbackDate));
    setTimeValue(DEFAULT_TIME);
  }, [selectedTeamId, selectedTeam]);

  useEffect(() => {
    if (scheduleMode !== "definition") return;
    if (!selectedDefinitionOption) return;

    if (selectedDefinitionOption.nextSlot) {
      setDateValue(selectedDefinitionOption.nextSlot.dateValue);
      setTimeValue(selectedDefinitionOption.nextSlot.timeValue);
      return;
    }

    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    setDateValue(toIsoDateLocal(fallbackDate));
    setTimeValue(selectedDefinitionOption.definition.startTime);
  }, [scheduleMode, selectedDefinitionOption]);

  const teamPickerOptions = useMemo(() => {
    const seen = new Map<string, number>();
    return manageableMemberships.map((membership) => {
      const baseName = membership.teamName;
      const count = (seen.get(baseName) ?? 0) + 1;
      seen.set(baseName, count);
      const displayName = count === 1 ? baseName : `${baseName} (${count})`;
      const memberCount = teamScheduleById[membership.teamId]?.memberCount ?? 0;
      const isSelectable = teamScheduleById[membership.teamId]?.isComplete ?? false;

      return {
        teamId: membership.teamId,
        displayName,
        memberCount,
        isSelectable,
        label: isSelectable
          ? `${displayName} - Completa`
          : `${displayName} - Incompleta (${memberCount}/${MIN_TEAM_MEMBERS})`,
      };
    });
  }, [manageableMemberships, teamScheduleById]);

  const selectedTeamPickerLabel =
    teamPickerOptions.find((option) => option.teamId === selectedTeamId)?.label ??
    "";

  const handleDismiss = () => {
    navigate(RETURN_TO_PROFILE_URL, { replace: true });
  };

  const handleDateChange = (nextDateValue: string) => {
    if (scheduleMode === "definition") {
      setScheduleMode("custom");
      setSelectedDefinitionId("");
    }
    setDateValue(nextDateValue);
  };

  const handleTimeChange = (nextTimeValue: string) => {
    if (scheduleMode === "definition") {
      setScheduleMode("custom");
      setSelectedDefinitionId("");
    }
    setTimeValue(nextTimeValue);
  };

  const handleCreate = async () => {
    if (!supabase) return;
    if (!selectedTeam || !selectedTeam.isComplete) {
      setError(
        `Seleciona uma equipa completa (${MIN_TEAM_MEMBERS} jogadores) para criar convocatória.`,
      );
      return;
    }

    setActionState("creating");
    setError(null);

    const scheduledAtIso = buildScheduledAtIso(dateValue, timeValue);
    if (!scheduledAtIso) {
      setError("Data/hora inválida.");
      setActionState("idle");
      return;
    }

    const gameDefinitionKey = buildGameDefinitionKey(
      selectedTeam,
      dateValue,
      timeValue,
      scheduleMode === "definition" ? selectedDefinitionId : null,
    );
    if (!gameDefinitionKey) {
      setError("Não foi possível identificar a definição do jogo.");
      setActionState("idle");
      return;
    }

    const { error: createError } = await supabase.rpc("create_convocation", {
      p_team_id: selectedTeam.id,
      p_title: selectedTeam.name,
      p_scheduled_at: scheduledAtIso,
      p_game_definition_key: gameDefinitionKey,
    });

    if (createError) {
      setError(createError.message);
      setActionState("idle");
      return;
    }

    navigate(RETURN_TO_PROFILE_URL, { replace: true });
  };

  if (membershipsLoading || loadingSchedules) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          A preparar formulário de convocatória...
        </p>
      </div>
    );
  }

  if (manageableMemberships.length === 0) {
    return (
      <div className="space-y-5 rounded-2xl bg-[var(--bg-surface)] p-6 text-center shadow-mui">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Acesso negado
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Apenas team admin, manager ou secretary podem criar convocatórias.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          Voltar ao Perfil
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Convocatória
        </p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Nova convocatória
        </h2>
      </header>

      <section className="space-y-4 rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            Time
          </span>
          <button
            type="button"
            onClick={() => setActivePicker("team")}
            className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center"
          >
            <span>{selectedTeam?.name ?? "Selecione um time completo"}</span>
            <span className="text-lg opacity-40">⌄</span>
          </button>
          <p className="text-xs text-[var(--text-secondary)]">
            Apenas equipas completas ({MIN_TEAM_MEMBERS} jogadores) podem ser
            selecionadas.
          </p>
          {!hasCompleteManageableTeam && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
              Ainda não tens nenhuma equipa completa para criar convocatória.
            </p>
          )}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectedTeam && selectedTeam.gameDefinitions.length > 0 && (
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                Modo
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScheduleMode("definition");
                    if (!selectedDefinitionId && definitionOptions[0]) {
                      setSelectedDefinitionId(definitionOptions[0].id);
                    }
                  }}
                  className={`rounded-2xl border-2 p-3 text-sm font-semibold transition-all ${
                    scheduleMode === "definition"
                      ? "border-primary-500 bg-primary-500/15 text-[var(--text-primary)]"
                      : "border-transparent bg-[var(--bg-app)] text-[var(--text-secondary)] hover:border-primary-500/40"
                  }`}
                >
                  Definição de jogo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleMode("custom");
                    setSelectedDefinitionId("");
                  }}
                  className={`rounded-2xl border-2 p-3 text-sm font-semibold transition-all ${
                    scheduleMode === "custom"
                      ? "border-primary-500 bg-primary-500/15 text-[var(--text-primary)]"
                      : "border-transparent bg-[var(--bg-app)] text-[var(--text-secondary)] hover:border-primary-500/40"
                  }`}
                >
                  Personalizado
                </button>
              </div>
            </label>
          )}

          {scheduleMode === "definition" && definitionOptions.length > 0 && (
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                Definição
              </span>
              <button
                type="button"
                onClick={() => setActivePicker("definition")}
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center"
              >
                <span>
                  {selectedDefinitionOption?.label ??
                    definitionOptions[0]?.label ??
                    "Seleciona uma definição"}
                </span>
                <span className="text-lg opacity-40">⌄</span>
              </button>
              <p className="text-xs text-[var(--text-secondary)]">
                A definição só guarda dia da semana e hora. Próxima ocorrência:{" "}
                {selectedDefinitionOption?.nextOccurrenceLabel ??
                  definitionOptions[0]?.nextOccurrenceLabel ??
                  "Sem ocorrência futura disponível"}
                .
              </p>
            </label>
          )}

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Data
            </span>
            <button
              type="button"
              onClick={() => setActivePicker("date")}
              disabled={scheduleMode === "definition"}
              className={`w-full rounded-2xl bg-[var(--bg-app)] border-2 p-4 transition-all text-[var(--text-primary)] font-medium flex justify-between items-center ${
                scheduleMode === "definition"
                  ? "cursor-not-allowed border-transparent opacity-60"
                  : "cursor-pointer border-transparent hover:border-primary-500/50"
              }`}
            >
              <span>{formatDateLabel(dateValue)}</span>
              <span className="text-lg opacity-40">📅</span>
            </button>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Hora
            </span>
            <button
              type="button"
              onClick={() => setActivePicker("time")}
              disabled={scheduleMode === "definition"}
              className={`w-full rounded-2xl bg-[var(--bg-app)] border-2 p-4 transition-all text-[var(--text-primary)] font-medium flex justify-between items-center ${
                scheduleMode === "definition"
                  ? "cursor-not-allowed border-transparent opacity-60"
                  : "cursor-pointer border-transparent hover:border-primary-500/50"
              }`}
            >
              <span>{timeValue}</span>
              <span className="text-lg opacity-40">🕘</span>
            </button>
          </label>
        </div>

        <div className="mt-4 flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={actionState !== "idle"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-200"
            title="Dispensar criação"
            aria-label="Dispensar criação"
          >
            💤
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={
              actionState !== "idle" || !selectedTeam || !selectedTeam.isComplete
            }
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95 disabled:opacity-60"
            title={
              selectedTeam?.isComplete
                ? "Criar convocatória"
                : `Precisas de uma equipa completa (${MIN_TEAM_MEMBERS} jogadores)`
            }
            aria-label="Criar convocatória"
          >
            {actionState === "creating" ? "⏳" : "📝"}
          </button>
        </div>

        {error && <p className="text-xs font-bold text-red-500">{error}</p>}
      </section>

      {activePicker === "team" && teamPickerOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Selecionar Time
              </h3>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>

            <div className="bg-[var(--bg-app)] rounded-2xl p-2 items-center min-w-[140px]">
              <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
                Time
              </div>
              <WheelPicker
                options={teamPickerOptions.map((option) => option.label)}
                value={selectedTeamPickerLabel ?? ""}
                onChange={(value) => {
                  const selectedOption = teamPickerOptions.find(
                    (option) => option.label === String(value),
                  );
                  if (!selectedOption) return;
                  if (!selectedOption.isSelectable) {
                    setError(
                      `A equipa "${selectedOption.displayName}" ainda está incompleta (${selectedOption.memberCount}/${MIN_TEAM_MEMBERS}).`,
                    );
                    return;
                  }
                  setError(null);
                  setSelectedTeamId(selectedOption.teamId);
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Equipas incompletas aparecem na lista, mas não podem ser
              selecionadas.
            </p>
          </div>
        </div>
      )}

      {activePicker === "definition" && definitionOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Selecionar definição
              </h3>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>

            <div className="bg-[var(--bg-app)] rounded-2xl p-2 items-center min-w-[140px]">
              <div className="text-[10px] font-bold text-center uppercase text-[var(--text-secondary)] mb-1">
                Definição
              </div>
              <WheelPicker
                options={definitionOptions.map((option) => option.label)}
                value={
                  selectedDefinitionOption?.label ??
                  definitionOptions[0]?.label ??
                  ""
                }
                onChange={(value) => {
                  const selectedOption = definitionOptions.find(
                    (option) => option.label === String(value),
                  );
                  if (!selectedOption) return;
                  setScheduleMode("definition");
                  setSelectedDefinitionId(selectedOption.id);
                  setError(null);
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Ao escolher uma definição, a data e hora usam o próximo horário
              disponível dessa definição.
            </p>
          </div>
        </div>
      )}

      {activePicker === "date" && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Escolher Data
              </h3>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>
            <WheelDatePicker value={dateValue} onChange={handleDateChange} />
          </div>
        </div>
      )}

      {activePicker === "time" && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Escolher Hora
              </h3>
              <button
                type="button"
                onClick={() => setActivePicker(null)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>
            <WheelTimePicker value={timeValue} onChange={handleTimeChange} />
          </div>
        </div>
      )}
    </div>
  );
}
