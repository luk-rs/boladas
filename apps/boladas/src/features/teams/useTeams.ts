import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../auth/useAuth";
import { Team, TeamMembership, TeamRequest } from "./types";

const DEFAULT_GAME_DEFINITIONS = [{ dayOfWeek: 1, startTime: "19:00" }];

function useTeamsState(userId: string | null, isSystemAdmin: boolean) {
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<TeamRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamRequest[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async () => {
    if (!supabase || !userId) return;

    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("id, team_id, team:teams(id,name), roles:team_member_roles(role)")
      .eq("user_id", userId);

    if (fetchError) {
      setMemberships([]);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => {
      const team = Array.isArray(row.team) ? row.team[0] : row.team;
      return {
        teamMemberId: row.id,
        teamId: row.team_id,
        teamName: team?.name ?? "Team",
        roles: (row.roles ?? []).map((role: any) => role.role),
      };
    });

    setMemberships(mapped);
    setActiveTeamIdState((current) =>
      current && mapped.some((membership) => membership.teamId === current)
        ? current
        : null,
    );
    setLoading(false);
  }, [userId]);

  const loadMyRequests = useCallback(async () => {
    if (!supabase || !userId) return;

    const { data, error: requestsError } = await supabase
      .from("team_requests")
      .select("id, name, status, created_at, requested_by")
      .eq("requested_by", userId);

    if (requestsError) setError(requestsError.message);
    else setMyRequests(data ?? []);
  }, [userId]);

  const loadAdminData = useCallback(async () => {
    if (!supabase || !isSystemAdmin) return;

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id,name");
    if (teamsError) setError(teamsError.message);
    else setAllTeams(teams ?? []);

    const { data: requests, error: requestsError } = await supabase
      .from("team_requests")
      .select("id, name, requested_by, created_at, status")
      .eq("status", "pending");
    if (requestsError) setError(requestsError.message);
    else setPendingRequests(requests ?? []);
  }, [isSystemAdmin]);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setActiveTeamIdState(null);
      setMyRequests([]);
      setPendingRequests([]);
      setAllTeams([]);
      setError(null);
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadMemberships();
    void loadMyRequests();
  }, [userId, loadMemberships, loadMyRequests]);

  useEffect(() => {
    if (!isSystemAdmin) {
      setPendingRequests([]);
      setAllTeams([]);
      return;
    }

    void loadAdminData();
  }, [isSystemAdmin, loadAdminData]);

  const createTeam = async (name: string) => {
    if (!supabase || !userId) return;

    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        created_by: userId,
        game_definitions: DEFAULT_GAME_DEFINITIONS,
      })
      .select("id,name")
      .single();

    if (teamError || !teamData) {
      setError(teamError?.message ?? "Failed to create team.");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .insert({ team_id: teamData.id, user_id: userId })
      .select("id")
      .single();

    if (memberError || !memberData) {
      setError(memberError?.message ?? "Failed to create team membership.");
      return;
    }

    const { error: roleError } = await supabase
      .from("team_member_roles")
      .insert([
        { team_member_id: memberData.id, role: "member" },
        { team_member_id: memberData.id, role: "team_admin" },
        { team_member_id: memberData.id, role: "manager" },
        { team_member_id: memberData.id, role: "secretary" },
        { team_member_id: memberData.id, role: "accountant" },
      ]);

    if (roleError) {
      setError(roleError.message);
      return;
    }

    setStatus("Team created.");
    await loadMemberships();
  };

  const requestTeam = async (name: string) => {
    if (!supabase) return;

    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    const { error: requestError } = await supabase.rpc("create_team_request", {
      p_name: name.trim(),
    });
    if (requestError) setError(requestError.message);
    else {
      setStatus("Request submitted.");
      await loadMyRequests();
    }
  };

  const voteTeam = (teamId: string) => {
    setActiveTeamIdState(teamId);
  };

  const createSystemTeam = async (name: string) => {
    if (!supabase || !userId) return;

    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        created_by: userId,
        game_definitions: DEFAULT_GAME_DEFINITIONS,
      })
      .select("id")
      .single();

    if (teamError || !teamData) {
      setError(teamError?.message ?? "Failed to create team.");
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .insert({ team_id: teamData.id, user_id: userId })
      .select("id")
      .single();

    if (memberError || !memberData) {
      setError(memberError?.message ?? "Failed to create team membership.");
      return;
    }

    const { error: roleError } = await supabase
      .from("team_member_roles")
      .insert([
        { team_member_id: memberData.id, role: "member" },
        { team_member_id: memberData.id, role: "team_admin" },
        { team_member_id: memberData.id, role: "manager" },
        { team_member_id: memberData.id, role: "secretary" },
        { team_member_id: memberData.id, role: "accountant" },
      ]);

    if (roleError) {
      setError(roleError.message);
      return;
    }

    setStatus("Team created.");
    await loadAdminData();
    await loadMemberships();
  };

  const deleteTeam = async (teamId: string) => {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);
    if (deleteError) setError(deleteError.message);
    else await loadAdminData();
  };

  const approveRequest = async (requestId: string) => {
    if (!supabase) return;

    const { error: approveError } = await supabase.rpc("approve_team_request", {
      p_request_id: requestId,
    });

    if (approveError) setError(approveError.message);
    else {
      setStatus("Request approved.");
      await loadAdminData();
      await loadMemberships();
    }
  };

  const denyRequest = async (requestId: string) => {
    if (!supabase) return;

    const { error: denyError } = await supabase.rpc("deny_team_request", {
      p_request_id: requestId,
    });

    if (denyError) setError(denyError.message);
    else {
      setStatus("Request denied.");
      await loadAdminData();
    }
  };

  const acceptInvite = async (token: string) => {
    if (!supabase) return;

    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setError("Please sign in before accepting an invite.");
      return;
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        display_name:
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      });
    }

    const { data, error: acceptError } = await supabase.rpc("accept_invite", {
      p_token: token,
    });
    if (acceptError) {
      setError(acceptError.message);
      return;
    }

    if (data) {
      setActiveTeamIdState(data);
      await loadMemberships();
      return data;
    }
  };

  const createEmailInvite = async (teamId: string, email: string) => {
    if (!supabase) {
      return {
        token: null,
        error: "Supabase client unavailable.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return {
        token: null,
        error: "Invite email is required.",
      };
    }

    setError(null);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error: inviteError } = await supabase.rpc("create_invite", {
      p_team_id: teamId,
      p_email: normalizedEmail,
      p_roles: ["member"],
      p_expires_at: expiresAt,
    });

    if (inviteError) {
      setError(inviteError.message);
      return {
        token: null,
        error: inviteError.message,
      };
    }

    const invite = Array.isArray(data) ? data[0] : data;
    const token =
      invite && typeof invite === "object" && "token" in invite
        ? typeof invite.token === "string" && invite.token.length > 0
          ? invite.token
          : null
        : null;

    if (!token) {
      const tokenError = "Invite token was not returned.";
      setError(tokenError);
      return {
        token: null,
        error: tokenError,
      };
    }

    return {
      token,
      error: null,
    };
  };

  const createGenericInvite = async (teamId: string) => {
    if (!supabase) return null;

    setError(null);
    const { data, error: inviteError } = await supabase.rpc(
      "create_generic_invite",
      {
        p_team_id: teamId,
      },
    );
    if (inviteError) {
      setError(inviteError.message);
      return null;
    }

    return data as string;
  };

  return {
    memberships,
    activeTeamId,
    myRequests,
    pendingRequests,
    allTeams,
    error,
    status,
    loading,
    createTeam,
    requestTeam,
    voteTeam,
    setActiveTeamId: (id: string | null) => {
      setActiveTeamIdState(id);
    },
    createSystemTeam,
    deleteTeam,
    approveRequest,
    denyRequest,
    acceptInvite,
    createEmailInvite,
    createGenericInvite,
  };
}

type TeamsContextValue = ReturnType<typeof useTeamsState>;

const TeamsContext = createContext<TeamsContextValue | undefined>(undefined);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { sessionUserId, isSystemAdmin } = useAuth();
  const value = useTeamsState(sessionUserId, isSystemAdmin);
  return createElement(TeamsContext.Provider, { value }, children);
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used inside TeamsProvider.");
  }
  return context;
}
