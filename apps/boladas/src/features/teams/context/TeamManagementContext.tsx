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
import type { ContextModel } from "../../../shared/types/context";
import { useAuth } from "../../auth/useAuth";
import {
  MANAGER_ROLES,
  MIN_TEAM_MEMBERS,
  PLAYER_EMOJIS,
} from "../../team-scope/constants";
import { useTeamScopeContext } from "../../team-scope/context/TeamScopeContext";
import { listTeamRosterStatus } from "../../team-scope/services/team-scope.service";
import type { TeamRequest, Team } from "../types";
import type { TeamRosterStatus } from "../../team-scope/types";
import {
  approveTeamRequest,
  assignRole,
  clearRoleFromOtherMembers,
  createEmailInvite,
  createGenericInvite,
  createSystemTeam,
  createTeam,
  createTeamRequest,
  deleteTeam,
  denyTeamRequest,
  listAdminTeamsAndRequests,
  listMyTeamRequests,
  listRosterMembers,
  removeRole,
  type TeamRosterMember,
} from "../services/team-management.service";

const TEAM_MANAGEMENT_ROLES = new Set(["team_admin", "manager"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteAction = "whatsapp" | "copy";
export type ExtraRole = "team_admin" | "manager" | "secretary" | "accountant";

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

type InviteResult = {
  email: string;
  link: string;
};

type TeamManagementState = {
  membershipsLoading: boolean;
  teamsWithStatus: TeamRosterStatus[];
  loadingTeams: boolean;
  activeTooltipId: string | null;
  myRequests: TeamRequest[];
  pendingRequests: TeamRequest[];
  allTeams: Team[];
  error: string | null;
  status: string | null;
  loading: boolean;
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
  selectedTeamCanManage: boolean;
  teamWheelOptions: TeamOption[];
  selectedTeamWheelLabel: string | undefined;
  selectedTeamId: string;
  teamPickerError: string | null;
  emailsTextareaRef: RefObject<HTMLTextAreaElement>;
  emailsInput: string;
  inviteError: string | null;
  loadingAction: InviteAction | null;
  copyFeedback: boolean;
  rosterMembers: TeamRosterMember[];
  loadingRoster: boolean;
  roleHolderCount: Record<ExtraRole, number>;
  roleActionKey: string | null;
  rolesError: string | null;
};

type TeamManagementActions = {
  onTooltipChange: (id: string | null) => void;
  refresh: () => Promise<void>;
  createTeam: (name: string) => Promise<void>;
  requestTeam: (name: string) => Promise<void>;
  createSystemTeam: (name: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  denyRequest: (requestId: string) => Promise<void>;
  setShowTeamPicker: (value: boolean) => void;
  setSelectedTeamId: (value: string) => void;
  clearTeamPickerError: () => void;
  setEmailsInput: (value: string) => void;
  syncEmailsTextareaHeight: () => void;
  resetInviteOutput: () => void;
  handleInviteAction: (action: InviteAction) => Promise<void>;
  handleToggleRole: (
    memberId: string,
    role: ExtraRole,
    isActive: boolean,
  ) => Promise<void>;
  setActiveTeamId: (id: string | null) => void;
  createEmailInvite: (teamId: string, email: string) => Promise<{
    token: string | null;
    error: string | null;
  }>;
  createGenericInvite: (teamId: string) => Promise<string | null>;
};

type TeamManagementModel = ContextModel<TeamManagementState, TeamManagementActions>;

const TeamManagementContext = createContext<TeamManagementModel | undefined>(
  undefined,
);

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

export function getMemberEmoji(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return PLAYER_EMOJIS[hash % PLAYER_EMOJIS.length];
}

export function TeamManagementProvider({ children }: { children: ReactNode }) {
  const { sessionUserId, isSystemAdmin } = useAuth();
  const {
    state: {
      memberships,
      loading: membershipsLoading,
      error: teamScopeError,
      activeTeamId,
    },
    actions: {
      refreshMemberships,
      setActiveTeamId,
    },
  } = useTeamScopeContext();

  const [teamsWithStatus, setTeamsWithStatus] = useState<TeamRosterStatus[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<TeamRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamRequest[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setActiveTeamId(value);
    },
    [memberships, setActiveTeamId],
  );

  const refresh = useCallback(async () => {
    if (!sessionUserId) {
      setMyRequests([]);
      setPendingRequests([]);
      setAllTeams([]);
      return;
    }

    const [requestsResult, rosterResult] = await Promise.all([
      listMyTeamRequests(sessionUserId),
      listTeamRosterStatus(memberships, sessionUserId),
    ]);

    if (requestsResult.error) {
      setError(requestsResult.error);
      setMyRequests([]);
    } else {
      setMyRequests(requestsResult.data);
    }

    setLoadingTeams(false);
    if (rosterResult.error) {
      setTeamsWithStatus([]);
      setError(rosterResult.error);
    } else {
      setTeamsWithStatus(rosterResult.data);
    }

    if (isSystemAdmin) {
      const adminResult = await listAdminTeamsAndRequests();
      if (adminResult.error) {
        setError(adminResult.error);
        setAllTeams([]);
        setPendingRequests([]);
      } else {
        setAllTeams(adminResult.data.allTeams);
        setPendingRequests(adminResult.data.pendingRequests);
      }
    } else {
      setAllTeams([]);
      setPendingRequests([]);
    }
  }, [sessionUserId, memberships, isSystemAdmin]);

  useEffect(() => {
    if (memberships.length === 0) {
      setSelectedTeamIdState("");
      return;
    }

    const hasSelectedTeam = memberships.some(
      (membership) => membership.teamId === selectedTeamId,
    );
    if (!hasSelectedTeam) {
      const fallbackId = activeTeamId ?? memberships[0].teamId;
      setSelectedTeamIdState(fallbackId);
    }
  }, [memberships, selectedTeamId, activeTeamId]);

  useEffect(() => {
    setLoadingTeams(true);
    void refresh();
  }, [refresh]);

  const loadRosterMembers = useCallback(async (teamId: string) => {
    setLoadingRoster(true);
    const result = await listRosterMembers(teamId);
    if (result.error) {
      setRosterMembers([]);
      setRolesError(result.error);
      setLoadingRoster(false);
      return;
    }

    setRosterMembers(result.data);
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

  const createEmailInviteAction = useCallback(
    async (teamId: string, email: string) => {
      const result = await createEmailInvite(teamId, email);
      if (result.error) {
        setError(result.error);
      }
      return {
        token: result.data,
        error: result.error,
      };
    },
    [],
  );

  const createGenericInviteAction = useCallback(async (teamId: string) => {
    const result = await createGenericInvite(teamId);
    if (result.error) {
      setError(result.error);
      return null;
    }
    return result.data;
  }, []);

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
      const response = await createEmailInviteAction(selectedTeam.teamId, email);
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
  }, [
    cachedBatch,
    createEmailInviteAction,
    emailsInput,
    selectedTeam,
    selectedTeamCanManage,
  ]);

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
      if (!selectedTeam?.teamId) return;
      if (!selectedTeamCanManage) {
        setRolesError(`Sem permissão para gerir "${selectedTeam.teamName}".`);
        return;
      }

      const actionKey = `${memberId}:${role}`;
      setRoleActionKey(actionKey);
      setRolesError(null);

      if (isActive) {
        const removeResult = await removeRole(memberId, role);
        if (removeResult.error) {
          setRolesError(removeResult.error);
        } else {
          await refreshMemberships();
          await loadRosterMembers(selectedTeam.teamId);
          await refresh();
        }

        setRoleActionKey(null);
        return;
      }

      const roleConfig = ROLE_TOGGLE_OPTIONS.find((option) => option.role === role);
      const assignResult = await assignRole(memberId, role);
      if (assignResult.error) {
        setRolesError(assignResult.error);
        setRoleActionKey(null);
        return;
      }

      if (roleConfig?.isUnique) {
        const clearResult = await clearRoleFromOtherMembers(
          role,
          rosterMembers.map((member) => member.id),
          memberId,
        );

        if (clearResult.error) {
          setRolesError(clearResult.error);
          setRoleActionKey(null);
          return;
        }
      }

      await refreshMemberships();
      await loadRosterMembers(selectedTeam.teamId);
      await refresh();
      setRoleActionKey(null);
    },
    [
      selectedTeam,
      selectedTeamCanManage,
      rosterMembers,
      refreshMemberships,
      loadRosterMembers,
      refresh,
    ],
  );

  const createTeamAction = useCallback(
    async (name: string) => {
      if (!sessionUserId) return;

      setError(null);
      setStatus(null);
      if (!name.trim()) {
        setError("O nome da equipa é obrigatório.");
        return;
      }

      setLoading(true);
      const result = await createTeam(name.trim(), sessionUserId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Equipa criada.");
        await refreshMemberships();
        await refresh();
      }
      setLoading(false);
    },
    [sessionUserId, refreshMemberships, refresh],
  );

  const requestTeamAction = useCallback(
    async (name: string) => {
      setError(null);
      setStatus(null);
      if (!name.trim()) {
        setError("O nome da equipa é obrigatório.");
        return;
      }

      const result = await createTeamRequest(name.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Pedido submetido.");
        await refresh();
      }
    },
    [refresh],
  );

  const createSystemTeamAction = useCallback(
    async (name: string) => {
      if (!sessionUserId) return;

      setError(null);
      setStatus(null);
      if (!name.trim()) {
        setError("O nome da equipa é obrigatório.");
        return;
      }

      const result = await createSystemTeam(name.trim(), sessionUserId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Equipa criada.");
        await refreshMemberships();
        await refresh();
      }
    },
    [sessionUserId, refreshMemberships, refresh],
  );

  const deleteTeamAction = useCallback(
    async (teamId: string) => {
      setError(null);
      setStatus(null);

      const result = await deleteTeam(teamId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Equipa eliminada.");
        await refreshMemberships();
        await refresh();
      }
    },
    [refreshMemberships, refresh],
  );

  const approveRequestAction = useCallback(
    async (requestId: string) => {
      const result = await approveTeamRequest(requestId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Pedido aprovado.");
        await refreshMemberships();
        await refresh();
      }
    },
    [refreshMemberships, refresh],
  );

  const denyRequestAction = useCallback(
    async (requestId: string) => {
      const result = await denyTeamRequest(requestId);
      if (result.error) {
        setError(result.error);
      } else {
        setStatus("Pedido recusado.");
        await refresh();
      }
    },
    [refresh],
  );

  const value = useMemo<TeamManagementModel>(
    () => ({
      state: {
        membershipsLoading,
        teamsWithStatus,
        loadingTeams,
        activeTooltipId,
        myRequests,
        pendingRequests,
        allTeams,
        error: error ?? teamScopeError,
        status,
        loading,
        manageableMemberships,
        selectedTeam,
        showTeamPicker,
        selectedTeamCanManage,
        teamWheelOptions,
        selectedTeamWheelLabel,
        selectedTeamId,
        teamPickerError,
        emailsTextareaRef,
        emailsInput,
        inviteError,
        loadingAction,
        copyFeedback,
        rosterMembers,
        loadingRoster,
        roleHolderCount,
        roleActionKey,
        rolesError,
      },
      actions: {
        onTooltipChange: setActiveTooltipId,
        refresh,
        createTeam: createTeamAction,
        requestTeam: requestTeamAction,
        createSystemTeam: createSystemTeamAction,
        deleteTeam: deleteTeamAction,
        approveRequest: approveRequestAction,
        denyRequest: denyRequestAction,
        setShowTeamPicker,
        setSelectedTeamId,
        clearTeamPickerError,
        setEmailsInput,
        syncEmailsTextareaHeight,
        resetInviteOutput,
        handleInviteAction,
        handleToggleRole,
        setActiveTeamId,
        createEmailInvite: createEmailInviteAction,
        createGenericInvite: createGenericInviteAction,
      },
    }),
    [
      membershipsLoading,
      teamsWithStatus,
      loadingTeams,
      activeTooltipId,
      myRequests,
      pendingRequests,
      allTeams,
      error,
      teamScopeError,
      status,
      loading,
      manageableMemberships,
      selectedTeam,
      showTeamPicker,
      selectedTeamCanManage,
      teamWheelOptions,
      selectedTeamWheelLabel,
      selectedTeamId,
      teamPickerError,
      emailsInput,
      inviteError,
      loadingAction,
      copyFeedback,
      rosterMembers,
      loadingRoster,
      roleHolderCount,
      roleActionKey,
      rolesError,
      refresh,
      createTeamAction,
      requestTeamAction,
      createSystemTeamAction,
      deleteTeamAction,
      approveRequestAction,
      denyRequestAction,
      setSelectedTeamId,
      clearTeamPickerError,
      handleInviteAction,
      handleToggleRole,
      setActiveTeamId,
      createEmailInviteAction,
      createGenericInviteAction,
    ],
  );

  return (
    <TeamManagementContext.Provider value={value}>
      {children}
    </TeamManagementContext.Provider>
  );
}

export function useTeamManagementContext() {
  const context = useContext(TeamManagementContext);
  if (!context) {
    throw new Error(
      "useTeamManagementContext tem de ser usado dentro de TeamManagementProvider.",
    );
  }
  return context;
}
