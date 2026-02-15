import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { useAuth } from "../../auth/useAuth";
import { TeamsSection } from "../dashboard/components/TeamsSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";
import { useTeams } from "../useTeams";
import {
  ROLE_TOGGLE_OPTIONS,
  TeamSettingsProvider,
  getMemberEmoji,
  useTeamSettingsContext,
} from "./team-settings/context/TeamSettingsContext";

export function TeamsPage() {
  return (
    <ProfileDashboardProvider>
      <TeamSettingsProvider>
        <TeamsPageView />
      </TeamSettingsProvider>
    </ProfileDashboardProvider>
  );
}

function TeamsPageView() {
  const { isSystemAdmin } = useAuth();
  const { deleteTeam } = useTeams();
  const {
    teamsWithStatus,
    loadingTeams,
    membershipsLoading,
    activeTooltipId,
    onTooltipChange,
  } = useProfileDashboardContext();

  const {
    hookLoading,
    hookError,
    manageableMemberships,
    selectedTeam,
    showTeamPicker,
    setShowTeamPicker,
    selectedTeamCanManage,
    teamWheelOptions,
    selectedTeamWheelLabel,
    selectedTeamId,
    setSelectedTeamId,
    teamPickerError,
    clearTeamPickerError,
    emailsTextareaRef,
    emailsInput,
    setEmailsInput,
    syncEmailsTextareaHeight,
    resetInviteOutput,
    inviteError,
    loadingAction,
    handleInviteAction,
    copyFeedback,
    rosterMembers,
    loadingRoster,
    roleHolderCount,
    roleActionKey,
    handleToggleRole,
    rolesError,
  } = useTeamSettingsContext();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteArmedSecondsLeft, setDeleteArmedSecondsLeft] = useState(0);
  const [deleteAttempted, setDeleteAttempted] = useState(false);
  const [pendingTeamWheelLabel, setPendingTeamWheelLabel] = useState<
    string | undefined
  >(undefined);

  const hasTeamAdminRole =
    selectedTeam?.roles.includes("team_admin") ?? false;
  const canDeleteSelectedTeam =
    Boolean(selectedTeam) && (isSystemAdmin || hasTeamAdminRole);

  useEffect(() => {
    setDeleteArmed(false);
    setDeleteBusy(false);
    setDeleteArmedSecondsLeft(0);
    setDeleteAttempted(false);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!showTeamPicker) return;
    setPendingTeamWheelLabel(selectedTeamWheelLabel ?? teamWheelOptions[0]?.label);
  }, [showTeamPicker, selectedTeamWheelLabel, teamWheelOptions]);

  useEffect(() => {
    if (!deleteArmed) {
      setDeleteArmedSecondsLeft(0);
      return;
    }

    const ARM_WINDOW_MS = 8000;
    const expiresAt = Date.now() + ARM_WINDOW_MS;
    setDeleteArmedSecondsLeft(Math.ceil(ARM_WINDOW_MS / 1000));

    const intervalId = window.setInterval(() => {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      setDeleteArmedSecondsLeft(remainingSeconds);

      if (remainingMs <= 0) {
        setDeleteArmed(false);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deleteArmed]);

  const handleArmDelete = () => {
    if (deleteBusy || !canDeleteSelectedTeam) return;
    setDeleteAttempted(false);
    setDeleteArmed(true);
  };

  const handleCancelDelete = () => {
    if (deleteBusy) return;
    setDeleteArmed(false);
  };

  const handleApproveDelete = async () => {
    if (deleteBusy || !selectedTeam || !canDeleteSelectedTeam) return;
    setDeleteBusy(true);
    setDeleteArmed(false);
    setDeleteAttempted(true);
    await deleteTeam(selectedTeam.teamId);
    setDeleteBusy(false);
  };

  if (hookLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Carregando...
        </p>
      </div>
    );
  }

  const hasAnyManagementAccess = manageableMemberships.length > 0;
  const teamsSectionLoading = membershipsLoading || loadingTeams;
  const activeTeamRows = teamsWithStatus.filter(
    (team) => team.id === selectedTeamId,
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Equipas
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Plantel e gestão por permissões
        </p>
      </header>

      {hasAnyManagementAccess ? (
        <>
          <section className="rounded-2xl p-5">
            <header className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Time
              </p>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Escopo da gestão
              </h3>
            </header>
            <button
              type="button"
              onClick={() => {
                clearTeamPickerError();
                setPendingTeamWheelLabel(
                  selectedTeamWheelLabel ?? teamWheelOptions[0]?.label,
                );
                setShowTeamPicker(true);
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-transparent bg-[var(--bg-app)] p-4 font-medium text-[var(--text-primary)] transition-all hover:border-primary-500/50"
            >
              <span>{selectedTeam?.teamName ?? "Selecione o time"}</span>
              <span className="text-lg opacity-40">⌄</span>
            </button>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Selecione qualquer time em que participa. As secções de gestão
              ajustam-se ao papel no time selecionado.
            </p>
            {teamPickerError && (
              <p className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-300">
                {teamPickerError}
              </p>
            )}
          </section>

          <TeamsSection
            teams={activeTeamRows}
            loading={teamsSectionLoading}
            activeTooltipId={activeTooltipId}
            onTooltipChange={onTooltipChange}
          />

          {selectedTeamCanManage ? (
            <>
              <section className="rounded-2xl p-5">
                <header className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      Papéis
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Atribuir funções no elenco
                    </h3>
                  </div>
                  <span className="text-2xl">👥</span>
                </header>

                <div className="space-y-4">
                  <div className="space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)]/70 p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Só 1
                      </p>
                      <p className="text-xs text-[var(--text-primary)]">
                        🧭 Manager · 🗂️ Secretário · 💰 Tesoureiro
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Múltiplos
                      </p>
                      <p className="text-xs text-[var(--text-primary)]">
                        🛡️ Team admin
                      </p>
                    </div>
                  </div>

                  {loadingRoster && rosterMembers.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Carregando elenco...
                    </p>
                  )}

                  {!loadingRoster && rosterMembers.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Nenhum membro encontrado para este time.
                    </p>
                  )}

                  {rosterMembers.length > 0 && (
                    <div className="space-y-2">
                      {rosterMembers.map((member) => {
                        const activeEmojiList = ROLE_TOGGLE_OPTIONS.filter(
                          (option) => member.roles.has(option.role),
                        )
                          .map((option) => option.emoji)
                          .join(" ");

                        return (
                          <div
                            key={member.id}
                            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)]/80 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                  {getMemberEmoji(member.id)} {member.displayName}
                                </p>
                                <p className="truncate text-xs text-[var(--text-secondary)]">
                                  {member.email || "sem email"}
                                  {activeEmojiList ? ` • ${activeEmojiList}` : ""}
                                </p>
                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                {ROLE_TOGGLE_OPTIONS.map((option) => {
                                  const isActive = member.roles.has(option.role);
                                  const actionKey = `${member.id}:${option.role}`;
                                  const isLoading = roleActionKey === actionKey;
                                  const isProtectedLastHolder =
                                    isActive && roleHolderCount[option.role] <= 1;

                                  return (
                                    <button
                                      key={option.role}
                                      type="button"
                                      onClick={() =>
                                        void handleToggleRole(
                                          member.id,
                                          option.role,
                                          isActive,
                                        )
                                      }
                                      disabled={
                                        (roleActionKey !== null &&
                                          roleActionKey !== actionKey) ||
                                        isProtectedLastHolder
                                      }
                                      title={option.label}
                                      aria-label={option.label}
                                      className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm transition-all active:scale-95 disabled:opacity-60 ${
                                        isActive
                                          ? "border-primary-500 bg-primary-500 text-white"
                                          : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                                      }`}
                                    >
                                      {isLoading ? "⏳" : option.emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {rolesError && (
                    <p className="text-xs font-bold text-red-500">{rolesError}</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl p-5">
                <header className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      Convites
                    </p>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Gestão de convites
                    </h3>
                  </div>
                  <span className="text-2xl">🔗</span>
                </header>

                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Gere convites privados para vários emails de uma vez. Cada email
                    receberá um link único (7 dias) para entrar como{" "}
                    <strong>Membro</strong>.
                  </p>

                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                      Emails (um por linha, vírgula ou espaço)
                    </span>
                    <textarea
                      ref={emailsTextareaRef}
                      value={emailsInput}
                      onChange={(event) => {
                        setEmailsInput(event.target.value);
                        resetInviteOutput();
                      }}
                      onInput={syncEmailsTextareaHeight}
                      placeholder="jogador1@email.com
jogador2@email.com"
                      rows={5}
                      className={`w-full resize-none overflow-hidden rounded-xl border bg-[var(--bg-app)] p-3 text-sm text-[var(--text-primary)] outline-none ${
                        inviteError
                          ? "border-red-500 focus:border-red-500"
                          : "border-[var(--border-color)] focus:border-primary-400"
                      }`}
                    />
                  </label>

                  {inviteError && (
                    <p className="text-xs font-bold text-red-500">{inviteError}</p>
                  )}

                  <div className="mt-1 flex w-full items-center justify-end gap-3">
                    <button
                      onClick={() => void handleInviteAction("whatsapp")}
                      disabled={loadingAction !== null || !selectedTeam}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95 disabled:opacity-60"
                      title="Enviar no WhatsApp"
                      aria-label="Enviar no WhatsApp"
                    >
                      {loadingAction === "whatsapp" ? "⏳" : "💬"}
                    </button>

                    <button
                      onClick={() => void handleInviteAction("copy")}
                      disabled={loadingAction !== null || !selectedTeam}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base text-slate-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100"
                      title="Copiar mensagem"
                      aria-label="Copiar mensagem"
                    >
                      {loadingAction === "copy" ? "⏳" : copyFeedback ? "✅" : "📋"}
                    </button>
                  </div>

                  {hookError && !deleteAttempted && (
                    <p className="text-xs text-red-500">{hookError}</p>
                  )}
                </div>
              </section>

              {selectedTeam && (
                <section className="rounded-2xl border border-rose-300/60 p-5">
                  <header className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">
                        Zona de risco
                      </p>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Apagar time
                      </h3>
                    </div>
                    <span className="text-2xl">🗑️</span>
                  </header>

                  <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Esta ação remove <strong>{selectedTeam.teamName}</strong> e
                      todos os dados associados.
                    </p>

                    {canDeleteSelectedTeam ? (
                      deleteArmed ? (
                        <div className="flex w-full items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            disabled={deleteBusy}
                            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleApproveDelete()}
                            disabled={deleteBusy}
                            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                          >
                            {deleteBusy ? "A apagar..." : "Confirmar apagar"}
                          </button>
                        </div>
                      ) : (
                        <SlideToArmDeleteControl
                          disabled={deleteBusy}
                          onArm={handleArmDelete}
                        />
                      )
                    ) : (
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        Só team admin ou system admin podem apagar este time.
                      </p>
                    )}

                    {deleteArmed && (
                      <p className="text-xs text-amber-600 dark:text-amber-300">
                        Confirmação armada por {deleteArmedSecondsLeft} segundo
                        {deleteArmedSecondsLeft === 1 ? "" : "s"}.
                      </p>
                    )}

                    {canDeleteSelectedTeam && deleteAttempted && hookError && (
                      <p className="text-xs font-bold text-red-500">{hookError}</p>
                    )}
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="rounded-2xl border border-[var(--border-color)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Gestão avançada
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                Permissões insuficientes
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Sem permissão de gestão para o time selecionado. Pode escolher
                outro time no escopo da gestão.
              </p>
            </section>
          )}
        </>
      ) : (
        <>
          <TeamsSection
            teams={teamsWithStatus}
            loading={teamsSectionLoading}
            activeTooltipId={activeTooltipId}
            onTooltipChange={onTooltipChange}
          />

          <section className="rounded-2xl border border-[var(--border-color)] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Gestão avançada
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Permissões insuficientes
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Convites e gestão de papéis só ficam disponíveis para manager ou
              team admin.
            </p>
          </section>
        </>
      )}

      {hasAnyManagementAccess && showTeamPicker && teamWheelOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="mx-auto w-full max-w-[450px] animate-in rounded-t-3xl bg-[var(--bg-app)] p-6 shadow-2xl slide-in-from-bottom duration-300">
            <div className="mb-6 flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Selecionar Time
              </h3>
              <button
                type="button"
                onClick={() => {
                  const nextLabel =
                    pendingTeamWheelLabel ?? selectedTeamWheelLabel ?? "";
                  const selectedOption = teamWheelOptions.find(
                    (option) => option.label === nextLabel,
                  );

                  if (!selectedOption) {
                    setShowTeamPicker(false);
                    return;
                  }

                  if (selectedOption.teamId !== selectedTeamId) {
                    setSelectedTeamId(selectedOption.teamId);
                    resetInviteOutput();
                  }

                  setShowTeamPicker(false);
                }}
                className="rounded-xl bg-primary-600 px-6 py-2 font-bold text-white shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>

            <div className="items-center rounded-2xl bg-[var(--bg-app)] p-2 min-w-[140px]">
              <div className="mb-1 text-center text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                Time
              </div>
              <WheelPicker
                options={teamWheelOptions.map((option) => option.label)}
                value={pendingTeamWheelLabel ?? selectedTeamWheelLabel ?? ""}
                onChange={(value) => {
                  setPendingTeamWheelLabel(String(value));
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              A seleção fica pendente até clicar em "Concluir".
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

type SlideToArmDeleteControlProps = {
  disabled: boolean;
  onArm: () => void;
};

function SlideToArmDeleteControl({
  disabled,
  onArm,
}: SlideToArmDeleteControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [progress, setProgress] = useState(0);

  const THUMB_SIZE = 40;
  const TRACK_PADDING = 4;
  const ARM_THRESHOLD = 0.98;

  const updateDrag = (nextX: number, maxX: number) => {
    const clampedX = Math.min(Math.max(nextX, 0), maxX);
    const nextProgress = maxX > 0 ? clampedX / maxX : 0;
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    setDragX(clampedX);
  };

  const readPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return { nextX: 0, maxX: 1 };
    }
    const rect = track.getBoundingClientRect();
    const maxX = Math.max(rect.width - THUMB_SIZE - TRACK_PADDING * 2, 1);
    const pointerX = clientX - rect.left;
    const nextX = pointerX - THUMB_SIZE / 2 - TRACK_PADDING;
    return { nextX, maxX };
  };

  const canStartDrag = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return false;
    const rect = track.getBoundingClientRect();
    const startZoneRight = rect.left + THUMB_SIZE + TRACK_PADDING * 2 + 8;
    return clientX <= startZoneRight;
  };

  const reset = () => {
    progressRef.current = 0;
    setProgress(0);
    setDragX(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!canStartDrag(event.clientX)) return;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { nextX, maxX } = readPointer(event.clientX);
    updateDrag(nextX, maxX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || pointerIdRef.current !== event.pointerId) return;
    const { nextX, maxX } = readPointer(event.clientX);
    updateDrag(nextX, maxX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldArm = progressRef.current >= ARM_THRESHOLD;
    pointerIdRef.current = null;
    reset();

    if (shouldArm) {
      onArm();
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIdRef.current = null;
    reset();
  };

  const fillWidth = TRACK_PADDING + dragX + THUMB_SIZE;

  return (
    <div
      ref={trackRef}
      className={`relative h-12 w-full touch-none select-none overflow-hidden rounded-full border ${
        disabled
          ? "cursor-not-allowed border-rose-200/50 opacity-60"
          : "cursor-ew-resize border-rose-300/70"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="absolute inset-0 bg-rose-50/70 dark:bg-rose-950/30" />
      <div
        className="absolute inset-y-0 left-0 rounded-r-full bg-rose-500/20 transition-[width] duration-75"
        style={{
          width: `${fillWidth}px`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-200">
        Arraste até ao fim para apagar
      </div>
      <div
        className="pointer-events-none absolute top-1 flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-base text-white shadow-lg transition-[left] duration-75"
        style={{ left: `${TRACK_PADDING + dragX}px` }}
      >
        »
      </div>
    </div>
  );
}
