import { WheelPicker } from "../../../components/ui/WheelPicker";
import { TeamsSection } from "../dashboard/components/TeamsSection";
import {
  ProfileDashboardProvider,
  useProfileDashboardContext,
} from "../dashboard/context/ProfileDashboardContext";
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
    selectedInviteTeam,
    showTeamPicker,
    setShowTeamPicker,
    teamWheelOptions,
    selectedTeamWheelLabel,
    selectedInviteTeamId,
    setSelectedInviteTeamId,
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

  if (hookLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Carregando...</p>
      </div>
    );
  }

  const hasManagementAccess = manageableMemberships.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Equipas</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Plantel e gestão por permissões
        </p>
      </header>

      <TeamsSection
        teams={teamsWithStatus}
        loading={membershipsLoading || loadingTeams}
        activeTooltipId={activeTooltipId}
        onTooltipChange={onTooltipChange}
      />

      {hasManagementAccess ? (
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
                setShowTeamPicker(true);
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-transparent bg-[var(--bg-app)] p-4 font-medium text-[var(--text-primary)] transition-all hover:border-primary-500/50"
            >
              <span>{selectedInviteTeam?.teamName ?? "Selecione o time"}</span>
              <span className="text-lg opacity-40">⌄</span>
            </button>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Times sem papel de team admin/manager aparecem na lista, mas não
              podem ser selecionados.
            </p>
            {teamPickerError && (
              <p className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-300">
                {teamPickerError}
              </p>
            )}
          </section>

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
                  <p className="text-xs text-[var(--text-primary)]">🛡️ Team admin</p>
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
                    const activeEmojiList = ROLE_TOGGLE_OPTIONS.filter((option) =>
                      member.roles.has(option.role),
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
                receberá um link único (7 dias) para entrar como <strong>Membro</strong>.
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
                  disabled={loadingAction !== null || !selectedInviteTeam}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95 disabled:opacity-60"
                  title="Enviar no WhatsApp"
                  aria-label="Enviar no WhatsApp"
                >
                  {loadingAction === "whatsapp" ? "⏳" : "💬"}
                </button>

                <button
                  onClick={() => void handleInviteAction("copy")}
                  disabled={loadingAction !== null || !selectedInviteTeam}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base text-slate-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100"
                  title="Copiar mensagem"
                  aria-label="Copiar mensagem"
                >
                  {loadingAction === "copy" ? "⏳" : copyFeedback ? "✅" : "📋"}
                </button>
              </div>

              {hookError && <p className="text-xs text-red-500">{hookError}</p>}
            </div>
          </section>
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
            Convites e gestão de papéis só ficam disponíveis para manager ou team
            admin.
          </p>
        </section>
      )}

      {hasManagementAccess && showTeamPicker && teamWheelOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="mx-auto w-full max-w-[450px] animate-in rounded-t-3xl bg-[var(--bg-app)] p-6 shadow-2xl slide-in-from-bottom duration-300">
            <div className="mb-6 flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Selecionar Time
              </h3>
              <button
                type="button"
                onClick={() => setShowTeamPicker(false)}
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
                value={selectedTeamWheelLabel ?? ""}
                onChange={(value) => {
                  const selectedOption = teamWheelOptions.find(
                    (option) => option.label === String(value),
                  );
                  if (
                    selectedOption &&
                    selectedOption.teamId !== selectedInviteTeamId
                  ) {
                    setSelectedInviteTeamId(selectedOption.teamId);
                    if (selectedOption.isSelectable) {
                      resetInviteOutput();
                    }
                  }
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Opções com "Sem acesso" estão visíveis para contexto, mas ficam
              bloqueadas para seleção.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
