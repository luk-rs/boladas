import { supabase } from "../../../shared/api/supabase/client";
import type {
  InviteInfo,
  TeamMembership,
  TeamRosterStatus,
} from "../types";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export async function listMemberships(
  userId: string,
): Promise<ServiceResult<TeamMembership[]>> {
  if (!supabase) {
    return { data: [], error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("id, team_id, team:teams(id,name), roles:team_member_roles(role)")
    .eq("user_id", userId);

  if (error) {
    return { data: [], error: error.message };
  }

  const memberships = (data ?? []).map((row) => {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    return {
      teamMemberId: row.id,
      teamId: row.team_id,
      teamName: team?.name ?? "Equipa",
      roles: (row.roles ?? []).map((role: { role: string }) => role.role),
    };
  });

  return { data: memberships, error: null };
}

async function ensureCurrentUserProfile(): Promise<string | null> {
  if (!supabase) {
    return "Cliente Supabase indisponível.";
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return userError.message;
  }

  const user = userData.user;
  if (!user) {
    return "Inicia sessão antes de aceitares um convite.";
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return profileError.message;
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    });

    if (insertError) {
      return insertError.message;
    }
  }

  return null;
}

export async function acceptInvite(
  token: string,
): Promise<ServiceResult<string | null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const profileError = await ensureCurrentUserProfile();
  if (profileError) {
    return { data: null, error: profileError };
  }

  const { data, error } = await supabase.rpc("accept_invite", {
    p_token: token,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data as string | null) ?? null, error: null };
}

export async function getInviteInfo(
  token: string,
): Promise<ServiceResult<InviteInfo | null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase.rpc("get_invite_info", {
    p_token: token,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { data: null, error: null };
  }

  return {
    data: {
      team_name: row.team_name,
      team_id: row.team_id,
    },
    error: null,
  };
}

export async function listTeamRosterStatus(
  memberships: TeamMembership[],
  sessionUserId: string | null,
): Promise<ServiceResult<TeamRosterStatus[]>> {
  if (!supabase) {
    return { data: [], error: "Cliente Supabase indisponível." };
  }

  const teamIds = memberships.map((membership) => membership.teamId);
  if (teamIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, user_id, created_at, profile:profiles(display_name,email)")
    .in("team_id", teamIds)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const membersByTeam = new Map<string, TeamRosterStatus["members"]>();
  teamIds.forEach((teamId) => membersByTeam.set(teamId, []));
  (data ?? []).forEach((row) => {
    const profile = row.profile as
      | { display_name?: string | null; email?: string | null }
      | { display_name?: string | null; email?: string | null }[]
      | null;
    const profileData = Array.isArray(profile) ? profile[0] : profile;
    const label = profileData?.display_name ?? profileData?.email ?? "Jogador";
    const teamMembers = membersByTeam.get(row.team_id) ?? [];
    teamMembers.push({
      id: `${row.team_id}-${row.user_id}`,
      label,
      isSelf: row.user_id === sessionUserId,
    });
    membersByTeam.set(row.team_id, teamMembers);
  });

  const mapped: TeamRosterStatus[] = memberships.map((membership) => ({
    id: membership.teamId,
    name: membership.teamName,
    memberCount: membersByTeam.get(membership.teamId)?.length ?? 0,
    members: membersByTeam.get(membership.teamId) ?? [],
  }));

  return { data: mapped, error: null };
}
