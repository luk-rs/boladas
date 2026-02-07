import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTeams } from "../useTeams";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { supabase } from "../../../lib/supabase";
import { PLAYER_EMOJIS } from "../dashboard/constants";

const TEAM_MANAGEMENT_ROLES = new Set(["team_admin", "manager"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteResult = {
  email: string;
  link: string;
};

type InviteAction = "whatsapp" | "copy";
type ExtraRole = "team_admin" | "manager" | "secretary" | "accountant";
type TeamRosterMember = {
  id: string;
  displayName: string;
  email: string;
  roles: Set<string>;
};

const ROLE_TOGGLE_OPTIONS: Array<{
  role: ExtraRole;
  emoji: string;
  label: string;
  isUnique: boolean;
}> = [
  { role: "team_admin", emoji: "🛡️", label: "Admin", isUnique: false },
  { role: "manager", emoji: "🧭", label: "Manager", isUnique: true },
  { role: "secretary", emoji: "🗂️", label: "Secretário", isUnique: true },
  { role: "accountant", emoji: "💰", label: "Tesoureiro", isUnique: true },
];

function parseEmails(raw: string) {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      invalid.push(part);
      continue;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      valid.push(normalized);
    }
  }

  return { valid, invalid };
}

function buildAggregateInviteMessage(teamName: string, results: InviteResult[]) {
  const rows = results.map(
    (result) => `Email: ${result.email}\nConvite privado: ${result.link}`,
  );
  return `Time: ${teamName}\n\n${rows.join("\n\n")}`;
}

function getMemberLabel(
  profile: { email?: string | null; display_name?: string | null } | null,
) {
  return profile?.display_name || profile?.email || "Jogador";
}

function getMemberEmoji(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return PLAYER_EMOJIS[hash % PLAYER_EMOJIS.length];
}

export function TeamSettingsPage() {
  const {
    memberships,
    createEmailInvite,
    error: hookError,
    loading: hookLoading,
  } = useTeams();

  const [selectedInviteTeamId, setSelectedInviteTeamId] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [emailsInput, setEmailsInput] = useState("");
  const emailsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [loadingAction, setLoadingAction] = useState<InviteAction | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [cachedBatch, setCachedBatch] = useState<{
    teamId: string;
    emailsKey: string;
    results: InviteResult[];
    aggregateMessage: string;
  } | null>(null);
  const [rosterMembers, setRosterMembers] = useState<TeamRosterMember[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roleActionKey, setRoleActionKey] = useState<string | null>(null);

  const manageableMemberships = useMemo(
    () =>
      memberships.filter((membership) =>
        membership.roles.some((role) => TEAM_MANAGEMENT_ROLES.has(role)),
      ),
    [memberships],
  );

  useEffect(() => {
    if (manageableMemberships.length === 0) {
      setSelectedInviteTeamId("");
      return;
    }

    const hasSelectedTeam = manageableMemberships.some(
      (membership) => membership.teamId === selectedInviteTeamId,
    );
    if (!hasSelectedTeam) {
      setSelectedInviteTeamId(manageableMemberships[0].teamId);
    }
  }, [manageableMemberships, selectedInviteTeamId]);

  const selectedInviteTeam =
    manageableMemberships.find(
      (membership) => membership.teamId === selectedInviteTeamId,
    ) ?? manageableMemberships[0];

  const teamWheelOptions = useMemo(() => {
    const seen = new Map<string, number>();
    return manageableMemberships.map((membership) => {
      const baseName = membership.teamName || "Time";
      const nextCount = (seen.get(baseName) ?? 0) + 1;
      seen.set(baseName, nextCount);
      return {
        teamId: membership.teamId,
        label: nextCount === 1 ? baseName : `${baseName} (${nextCount})`,
      };
    });
  }, [manageableMemberships]);

  const selectedTeamWheelLabel =
    teamWheelOptions.find((option) => option.teamId === selectedInviteTeam?.teamId)
      ?.label ?? teamWheelOptions[0]?.label;

  const roleHolderCount = useMemo(() => {
    const counts: Record<ExtraRole, number> = {
      team_admin: 0,
      manager: 0,
      secretary: 0,
      accountant: 0,
    };

    for (const member of rosterMembers) {
      for (const option of ROLE_TOGGLE_OPTIONS) {
        if (member.roles.has(option.role)) {
          counts[option.role] += 1;
        }
      }
    }

    return counts;
  }, [rosterMembers]);

  const loadRosterMembers = useCallback(async (teamId: string) => {
    if (!supabase) return;

    setLoadingRoster(true);
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id, user_id, profiles:profiles(email,display_name), roles:team_member_roles(role)",
      )
      .eq("team_id", teamId);

    if (error) {
      setRosterMembers([]);
      setRolesError(error.message);
      setLoadingRoster(false);
      return;
    }

    const mapped = (data ?? [])
      .map((row: any) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const email = profile?.email ?? "";
        return {
          id: row.id as string,
          displayName: getMemberLabel(profile),
          email,
          roles: new Set<string>((row.roles ?? []).map((item: any) => item.role)),
        };
      })
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "pt-PT", {
          sensitivity: "base",
        }),
      );

    setRosterMembers(mapped);
    setLoadingRoster(false);
  }, []);

  useEffect(() => {
    if (!selectedInviteTeam?.teamId) {
      setRosterMembers([]);
      setLoadingRoster(false);
      return;
    }
    setRolesError(null);
    void loadRosterMembers(selectedInviteTeam.teamId);
  }, [selectedInviteTeam?.teamId, loadRosterMembers]);

  const syncEmailsTextareaHeight = () => {
    const textarea = emailsTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    syncEmailsTextareaHeight();
  }, [emailsInput]);

  const resetInviteOutput = () => {
    setInviteError(null);
    setCopyFeedback(false);
    setCachedBatch(null);
  };

  const prepareInviteBatch = async () => {
    if (!selectedInviteTeam) return null;

    const { valid, invalid } = parseEmails(emailsInput);
    if (valid.length === 0) {
      setInviteError(
        invalid.length > 0
          ? `Nenhum email válido encontrado. Inválidos: ${invalid.join(", ")}`
          : "Adicione pelo menos um email válido.",
      );
      return null;
    }

    const emailsKey = valid.join("|");
    const baseFailures = invalid.map((email) => `${email} (email inválido)`);

    if (
      cachedBatch &&
      cachedBatch.teamId === selectedInviteTeam.teamId &&
      cachedBatch.emailsKey === emailsKey
    ) {
      return {
        results: cachedBatch.results,
        aggregateMessage: cachedBatch.aggregateMessage,
        failures: baseFailures,
      };
    }

    const results: InviteResult[] = [];
    const failures: string[] = [...baseFailures];

    for (const email of valid) {
      const response = await createEmailInvite(selectedInviteTeam.teamId, email);
      if (!response.token) {
        failures.push(response.error ? `${email} (${response.error})` : email);
        continue;
      }

      const link = `${window.location.origin}/join/${response.token}`;
      results.push({ email, link });
    }

    const nextAggregateMessage =
      results.length > 0
        ? buildAggregateInviteMessage(selectedInviteTeam.teamName, results)
        : "";

    if (results.length === 0) {
      setInviteError(
        failures.length > 0
          ? `Não foi possível gerar convites: ${failures.join(", ")}`
          : "Não foi possível gerar convites.",
      );
      return null;
    }

    setCachedBatch({
      teamId: selectedInviteTeam.teamId,
      emailsKey,
      results,
      aggregateMessage: nextAggregateMessage,
    });

    return {
      results,
      aggregateMessage: nextAggregateMessage,
      failures,
    };
  };

  const handleInviteAction = async (action: InviteAction) => {
    if (!selectedInviteTeam) return;

    setLoadingAction(action);
    setInviteError(null);
    setCopyFeedback(false);

    const payload = await prepareInviteBatch();
    if (!payload) {
      setLoadingAction(null);
      return;
    }

    const failures = [...payload.failures];

    if (action === "whatsapp") {
      const openedWindow = window.open(
        `https://wa.me/?text=${encodeURIComponent(payload.aggregateMessage)}`,
        "_blank",
        "noreferrer",
      );
      if (!openedWindow) {
        failures.push("não foi possível abrir o WhatsApp no navegador");
      }
    }

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(payload.aggregateMessage);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch {
        failures.push("não foi possível copiar a mensagem");
      }
    }

    if (failures.length > 0) {
      setInviteError(`Falhas: ${failures.join(", ")}`);
    }

    setLoadingAction(null);
  };

  const handleToggleRole = async (
    memberId: string,
    role: ExtraRole,
    isActive: boolean,
  ) => {
    if (!supabase || !selectedInviteTeam?.teamId) return;

    const actionKey = `${memberId}:${role}`;
    setRoleActionKey(actionKey);
    setRolesError(null);

    if (isActive) {
      const { error } = await supabase
        .from("team_member_roles")
        .delete()
        .eq("team_member_id", memberId)
        .eq("role", role);

      if (error) {
        setRolesError(error.message);
      } else {
        await loadRosterMembers(selectedInviteTeam.teamId);
      }

      setRoleActionKey(null);
      return;
    }

    const roleConfig = ROLE_TOGGLE_OPTIONS.find((option) => option.role === role);
    if (roleConfig?.isUnique) {
      const { error: assignError } = await supabase
        .from("team_member_roles")
        .insert({ team_member_id: memberId, role });

      if (assignError) {
        setRolesError(assignError.message);
        setRoleActionKey(null);
        return;
      }

      const teamMemberIds = rosterMembers.map((member) => member.id);
      if (teamMemberIds.length > 0) {
        const { error: clearError } = await supabase
          .from("team_member_roles")
          .delete()
          .eq("role", role)
          .in("team_member_id", teamMemberIds)
          .neq("team_member_id", memberId);

        if (clearError) {
          setRolesError(clearError.message);
          setRoleActionKey(null);
          return;
        }
      }
    } else {
      const { error: assignError } = await supabase
        .from("team_member_roles")
        .insert({ team_member_id: memberId, role });

      if (assignError) {
        setRolesError(assignError.message);
        setRoleActionKey(null);
        return;
      }
    }

    await loadRosterMembers(selectedInviteTeam.teamId);
    setRoleActionKey(null);
  };

  if (hookLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Carregando...</p>
      </div>
    );
  }

  if (manageableMemberships.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-center p-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-xl font-bold text-red-500 mb-2">Acesso Negado</h2>
          <p className="text-[var(--text-secondary)]">
            Apenas manager e team admin podem acessar a gestão de times.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Gestão de Time
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Convites privados e próximos módulos de gestão
        </p>
      </header>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
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
          onClick={() => setShowTeamPicker(true)}
          className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center"
        >
          <span>{selectedInviteTeam?.teamName ?? "Selecione o time"}</span>
          <span className="text-lg opacity-40">⌄</span>
        </button>
      </section>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
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
            <p className="text-sm text-[var(--text-secondary)]">Carregando elenco...</p>
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
                                void handleToggleRole(member.id, option.role, isActive)
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

          {rolesError && <p className="text-xs font-bold text-red-500">{rolesError}</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
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
              className={`w-full rounded-xl border bg-[var(--bg-app)] p-3 text-sm text-[var(--text-primary)] outline-none resize-none overflow-hidden ${
                inviteError
                  ? "border-red-500 focus:border-red-500"
                  : "border-[var(--border-color)] focus:border-primary-400"
              }`}
            />
          </label>

          {inviteError && <p className="text-xs font-bold text-red-500">{inviteError}</p>}

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

      {showTeamPicker && teamWheelOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Selecionar Time
              </h3>
              <button
                type="button"
                onClick={() => setShowTeamPicker(false)}
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
                    resetInviteOutput();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
