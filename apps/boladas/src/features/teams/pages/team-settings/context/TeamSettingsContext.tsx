import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { supabase } from "../../../../../lib/supabase";
import { PLAYER_EMOJIS } from "../../../dashboard/constants";
import { useTeams } from "../../../useTeams";

const TEAM_MANAGEMENT_ROLES = new Set(["team_admin", "manager"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteResult = {
  email: string;
  link: string;
};

export type InviteAction = "whatsapp" | "copy";
export type ExtraRole = "team_admin" | "manager" | "secretary" | "accountant";
export type TeamRosterMember = {
  id: string;
  displayName: string;
  email: string;
  roles: Set<string>;
};

export const ROLE_TOGGLE_OPTIONS: Array<{
  role: ExtraRole;
  emoji: string;
  label: string;
  isUnique: boolean;
}> = [
  { role: "team_admin", emoji: "🛡️", label: "Admin", isUnique: false },
  { role: "manager", emoji: "🧭", label: "Gestor", isUnique: true },
  { role: "secretary", emoji: "🗂️", label: "Secretário", isUnique: true },
  { role: "accountant", emoji: "💰", label: "Tesoureiro", isUnique: true },
];

type ManageableMembership = {
  teamId: string;
  teamName: string;
  roles: string[];
  teamMemberId: string;
};

type TeamOption = {
  teamId: string;
  displayName: string;
  label: string;
};

type TeamSettingsContextValue = {
  hookLoading: boolean;
  hookError: string | null;
  manageableMemberships: ManageableMembership[];
  selectedTeam:
    | {
        teamId: string;
        teamName: string;
        roles: string[];
        teamMemberId: string;
      }
    | undefined;
  showTeamPicker: boolean;
  setShowTeamPicker: (value: boolean) => void;
  selectedTeamCanManage: boolean;
  teamWheelOptions: TeamOption[];
  selectedTeamWheelLabel: string | undefined;
  selectedTeamId: string;
  setSelectedTeamId: (value: string) => void;
  teamPickerError: string | null;
  clearTeamPickerError: () => void;
  emailsTextareaRef: RefObject<HTMLTextAreaElement>;
  emailsInput: string;
  setEmailsInput: (value: string) => void;
  syncEmailsTextareaHeight: () => void;
  resetInviteOutput: () => void;
  inviteError: string | null;
  loadingAction: InviteAction | null;
  handleInviteAction: (action: InviteAction) => Promise<void>;
  copyFeedback: boolean;
  rosterMembers: TeamRosterMember[];
  loadingRoster: boolean;
  roleHolderCount: Record<ExtraRole, number>;
  roleActionKey: string | null;
  handleToggleRole: (
    memberId: string,
    role: ExtraRole,
    isActive: boolean,
  ) => Promise<void>;
  rolesError: string | null;
};

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
  return `Equipa: ${teamName}\n\n${rows.join("\n\n")}`;
}

function getMemberLabel(
  profile: { email?: string | null; display_name?: string | null } | null,
) {
  return profile?.display_name || profile?.email || "Jogador";
}

export function getMemberEmoji(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return PLAYER_EMOJIS[hash % PLAYER_EMOJIS.length];
}

const TeamSettingsContext = createContext<TeamSettingsContextValue | undefined>(
  undefined,
);

export function TeamSettingsProvider({ children }: { children: ReactNode }) {
  const {
    memberships,
    createEmailInvite,
    refreshMemberships,
    error: hookError,
    loading: hookLoading,
  } = useTeams();
  const [selectedTeamId, setSelectedTeamIdState] = useState("");
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [teamPickerError, setTeamPickerError] = useState<string | null>(null);
  const [emailsInput, setEmailsInput] = useState("");
  const emailsTextareaRef = useRef<HTMLTextAreaElement>(null);
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
    if (memberships.length === 0) {
      setSelectedTeamIdState("");
      return;
    }

    const hasSelectedTeam = memberships.some(
      (membership) => membership.teamId === selectedTeamId,
    );
    if (!hasSelectedTeam) {
      setSelectedTeamIdState(memberships[0].teamId);
    }
  }, [memberships, selectedTeamId]);

  const clearTeamPickerError = useCallback(() => {
    setTeamPickerError(null);
  }, []);

  const setSelectedTeamId = useCallback(
    (value: string) => {
      const isMemberOfTeam = memberships.some(
        (membership) => membership.teamId === value,
      );

      if (!isMemberOfTeam) {
        setTeamPickerError("Equipa inválida para o utilizador atual.");
        return;
      }

      setTeamPickerError(null);
      setSelectedTeamIdState(value);
    },
    [memberships],
  );

  const selectedTeam =
    memberships.find((membership) => membership.teamId === selectedTeamId) ??
    memberships[0];

  const selectedTeamCanManage =
    selectedTeam?.roles.some((role) => TEAM_MANAGEMENT_ROLES.has(role)) ?? false;

  const teamWheelOptions = useMemo(() => {
    const seen = new Map<string, number>();
    return memberships.map((membership) => {
      const baseName = membership.teamName || "Equipa";
      const nextCount = (seen.get(baseName) ?? 0) + 1;
      seen.set(baseName, nextCount);
      const displayName = nextCount === 1 ? baseName : `${baseName} (${nextCount})`;
      return {
        teamId: membership.teamId,
        displayName,
        label: displayName,
      };
    });
  }, [memberships]);

  const selectedTeamWheelLabel =
    teamWheelOptions.find((option) => option.teamId === selectedTeam?.teamId)
      ?.label ??
    teamWheelOptions[0]?.label;

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
    if (!selectedTeam?.teamId) {
      setRosterMembers([]);
      setLoadingRoster(false);
      return;
    }
    setRolesError(null);
    void loadRosterMembers(selectedTeam.teamId);
  }, [selectedTeam?.teamId, loadRosterMembers]);

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

  const prepareInviteBatch = useCallback(async () => {
    if (!selectedTeam) return null;
    if (!selectedTeamCanManage) {
      setInviteError(`Sem permissão para gerir "${selectedTeam.teamName}".`);
      return null;
    }

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
      cachedBatch.teamId === selectedTeam.teamId &&
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
      const response = await createEmailInvite(selectedTeam.teamId, email);
      if (!response.token) {
        failures.push(response.error ? `${email} (${response.error})` : email);
        continue;
      }

      const link = `${window.location.origin}/join/${response.token}`;
      results.push({ email, link });
    }

    const nextAggregateMessage =
      results.length > 0
        ? buildAggregateInviteMessage(selectedTeam.teamName, results)
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
      teamId: selectedTeam.teamId,
      emailsKey,
      results,
      aggregateMessage: nextAggregateMessage,
    });

    return {
      results,
      aggregateMessage: nextAggregateMessage,
      failures,
    };
  }, [cachedBatch, createEmailInvite, emailsInput, selectedTeam, selectedTeamCanManage]);

  const handleInviteAction = useCallback(
    async (action: InviteAction) => {
      if (!selectedTeam) return;
      if (!selectedTeamCanManage) {
        setInviteError(`Sem permissão para gerir "${selectedTeam.teamName}".`);
        return;
      }

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
    },
    [prepareInviteBatch, selectedTeam, selectedTeamCanManage],
  );

  const handleToggleRole = useCallback(
    async (memberId: string, role: ExtraRole, isActive: boolean) => {
      if (!supabase || !selectedTeam?.teamId) return;
      if (!selectedTeamCanManage) {
        setRolesError(`Sem permissão para gerir "${selectedTeam.teamName}".`);
        return;
      }

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
          await refreshMemberships();
          await loadRosterMembers(selectedTeam.teamId);
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

      await refreshMemberships();
      await loadRosterMembers(selectedTeam.teamId);
      setRoleActionKey(null);
    },
    [
      loadRosterMembers,
      refreshMemberships,
      rosterMembers,
      selectedTeam?.teamId,
      selectedTeamCanManage,
      selectedTeam?.teamName,
    ],
  );

  const value = useMemo(
    () => ({
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
    }),
    [
      hookLoading,
      hookError,
      manageableMemberships,
      selectedTeam,
      showTeamPicker,
      selectedTeamCanManage,
      teamWheelOptions,
      selectedTeamWheelLabel,
      selectedTeamId,
      setSelectedTeamId,
      teamPickerError,
      clearTeamPickerError,
      emailsInput,
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
    ],
  );

  return (
    <TeamSettingsContext.Provider value={value}>
      {children}
    </TeamSettingsContext.Provider>
  );
}

export function useTeamSettingsContext() {
  const context = useContext(TeamSettingsContext);
  if (!context) {
    throw new Error(
      "useTeamSettingsContext tem de ser usado dentro de TeamSettingsProvider.",
    );
  }
  return context;
}
