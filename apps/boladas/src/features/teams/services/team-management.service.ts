import { supabase } from "../../../shared/api/supabase/client";
import type { Team, TeamRequest } from "../types";

const DEFAULT_GAME_DEFINITIONS = [{ dayOfWeek: 1, startTime: "19:00" }];

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export type TeamRosterMember = {
  id: string;
  displayName: string;
  email: string;
  roles: Set<string>;
};

function getMemberLabel(
  profile: { email?: string | null; display_name?: string | null } | null,
) {
  return profile?.display_name || profile?.email || "Jogador";
}

export async function listMyTeamRequests(
  userId: string,
): Promise<ServiceResult<TeamRequest[]>> {
  if (!supabase) {
    return { data: [], error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase
    .from("team_requests")
    .select("id, name, status, created_at, requested_by")
    .eq("requested_by", userId);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as TeamRequest[], error: null };
}

export async function listAdminTeamsAndRequests(): Promise<
  ServiceResult<{ allTeams: Team[]; pendingRequests: TeamRequest[] }>
> {
  if (!supabase) {
    return {
      data: { allTeams: [], pendingRequests: [] },
      error: "Cliente Supabase indisponível.",
    };
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,name");

  if (teamsError) {
    return {
      data: { allTeams: [], pendingRequests: [] },
      error: teamsError.message,
    };
  }

  const { data: requests, error: requestsError } = await supabase
    .from("team_requests")
    .select("id, name, requested_by, created_at, status")
    .eq("status", "pending");

  if (requestsError) {
    return {
      data: { allTeams: (teams ?? []) as Team[], pendingRequests: [] },
      error: requestsError.message,
    };
  }

  return {
    data: {
      allTeams: (teams ?? []) as Team[],
      pendingRequests: (requests ?? []) as TeamRequest[],
    },
    error: null,
  };
}

async function createTeamWithOwnerRoles(
  name: string,
  userId: string,
): Promise<ServiceResult<string>> {
  if (!supabase) {
    return { data: "", error: "Cliente Supabase indisponível." };
  }

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      created_by: userId,
      game_definitions: DEFAULT_GAME_DEFINITIONS,
    })
    .select("id")
    .single();

  if (teamError || !teamData) {
    return { data: "", error: teamError?.message ?? "Não foi possível criar a equipa." };
  }

  const { data: memberData, error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: teamData.id, user_id: userId })
    .select("id")
    .single();

  if (memberError || !memberData) {
    return {
      data: "",
      error:
        memberError?.message ??
        "Não foi possível criar a associação de membro à equipa.",
    };
  }

  const { error: roleError } = await supabase.from("team_member_roles").insert([
    { team_member_id: memberData.id, role: "member" },
    { team_member_id: memberData.id, role: "team_admin" },
    { team_member_id: memberData.id, role: "manager" },
    { team_member_id: memberData.id, role: "secretary" },
    { team_member_id: memberData.id, role: "accountant" },
  ]);

  if (roleError) {
    return { data: "", error: roleError.message };
  }

  return { data: teamData.id, error: null };
}

export async function createTeam(
  name: string,
  userId: string,
): Promise<ServiceResult<string>> {
  return createTeamWithOwnerRoles(name, userId);
}

export async function createSystemTeam(
  name: string,
  userId: string,
): Promise<ServiceResult<string>> {
  return createTeamWithOwnerRoles(name, userId);
}

export async function createTeamRequest(name: string): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("create_team_request", {
    p_name: name,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function deleteTeam(teamId: string): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function approveTeamRequest(
  requestId: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("approve_team_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function denyTeamRequest(
  requestId: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("deny_team_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function createEmailInvite(
  teamId: string,
  email: string,
): Promise<ServiceResult<string | null>> {
  if (!supabase) {
    return {
      data: null,
      error: "Cliente Supabase indisponível.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { data: null, error: "O email do convite é obrigatório." };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("create_invite", {
    p_team_id: teamId,
    p_email: normalizedEmail,
    p_roles: ["member"],
    p_expires_at: expiresAt,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const invite = Array.isArray(data) ? data[0] : data;
  const token =
    invite && typeof invite === "object" && "token" in invite
      ? typeof invite.token === "string" && invite.token.length > 0
        ? invite.token
        : null
      : null;

  if (!token) {
    return { data: null, error: "O token do convite não foi devolvido." };
  }

  return { data: token, error: null };
}

export async function createGenericInvite(
  teamId: string,
): Promise<ServiceResult<string | null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase.rpc("create_generic_invite", {
    p_team_id: teamId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data as string | null) ?? null, error: null };
}

export async function listRosterMembers(
  teamId: string,
): Promise<ServiceResult<TeamRosterMember[]>> {
  if (!supabase) {
    return { data: [], error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, user_id, profiles:profiles(email,display_name), roles:team_member_roles(role)",
    )
    .eq("team_id", teamId);

  if (error) {
    return { data: [], error: error.message };
  }

  const mapped = (data ?? [])
    .map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id as string,
        displayName: getMemberLabel(profile),
        email: profile?.email ?? "",
        roles: new Set<string>((row.roles ?? []).map((item: any) => item.role)),
      };
    })
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "pt-PT", {
        sensitivity: "base",
      }),
    );

  return { data: mapped, error: null };
}

export async function removeRole(
  teamMemberId: string,
  role: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase
    .from("team_member_roles")
    .delete()
    .eq("team_member_id", teamMemberId)
    .eq("role", role);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function assignRole(
  teamMemberId: string,
  role: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase
    .from("team_member_roles")
    .insert({ team_member_id: teamMemberId, role });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function clearRoleFromOtherMembers(
  role: string,
  teamMemberIds: string[],
  keeperTeamMemberId: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  if (teamMemberIds.length === 0) {
    return { data: null, error: null };
  }

  const { error } = await supabase
    .from("team_member_roles")
    .delete()
    .eq("role", role)
    .in("team_member_id", teamMemberIds)
    .neq("team_member_id", keeperTeamMemberId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}
