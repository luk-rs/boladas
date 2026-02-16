import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ContextModel } from "../../../shared/types/context";
import { useAuth } from "../../auth/useAuth";
import { useTeamScopeContext } from "../../team-scope/context/TeamScopeContext";
import {
  EMPTY_STATS,
  loadProfileHeaderData,
  type HeaderStats,
} from "../services/profile.service";

type ProfileState = {
  displayName: string;
  roleLabel: string;
  headerLoading: boolean;
  stats: HeaderStats;
};

type ProfileActions = {
  refresh: () => Promise<void>;
};

type ProfileModel = ContextModel<ProfileState, ProfileActions>;

const ROLE_PRIORITY = [
  "player",
  "manager",
  "team_admin",
  "secretary",
  "accountant",
  "member",
] as const;

const ROLE_LABELS: Record<(typeof ROLE_PRIORITY)[number], string> = {
  player: "Jogador",
  manager: "Gestor",
  team_admin: "Admin da equipa",
  secretary: "Secretário",
  accountant: "Tesoureiro",
  member: "Membro",
};

function resolveRoleLabel(roleGroups: string[][]) {
  for (const role of ROLE_PRIORITY) {
    if (roleGroups.some((roles) => roles.includes(role))) {
      return ROLE_LABELS[role];
    }
  }
  return "Jogador";
}

const ProfileContext = createContext<ProfileModel | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { sessionUserId, sessionEmail } = useAuth();
  const {
    state: { memberships },
  } = useTeamScopeContext();
  const [displayName, setDisplayName] = useState("Jogador");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [stats, setStats] = useState<HeaderStats>(EMPTY_STATS);

  const roleLabel = useMemo(
    () => resolveRoleLabel(memberships.map((membership) => membership.roles)),
    [memberships],
  );

  const refresh = useCallback(async () => {
    setHeaderLoading(true);

    const result = await loadProfileHeaderData({
      sessionUserId,
      sessionEmail,
      teamIds: memberships.map((membership) => membership.teamId),
    });

    setDisplayName(result.data.displayName);
    setStats(result.data.stats);
    setHeaderLoading(false);
  }, [sessionUserId, sessionEmail, memberships]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ProfileModel>(
    () => ({
      state: {
        displayName,
        roleLabel,
        headerLoading,
        stats,
      },
      actions: {
        refresh,
      },
    }),
    [displayName, roleLabel, headerLoading, stats, refresh],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error(
      "useProfileContext tem de ser usado dentro de ProfileProvider.",
    );
  }
  return context;
}
