import { supabase } from "../../../shared/api/supabase/client";
import type { Invite, TeamMemberRow } from "../types";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

const SUPABASE_UNAVAILABLE_ERROR = "Cliente Supabase indisponível.";

export async function listTeamMembers(
  teamId: string,
): Promise<ServiceResult<TeamMemberRow[]>> {
  if (!supabase) {
    return { data: [], error: SUPABASE_UNAVAILABLE_ERROR };
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

  const mapped: TeamMemberRow[] = (data ?? []).map(
    (row: {
      id: string;
      user_id: string;
      profiles:
        | { email: string | null; display_name: string | null }
        | { email: string | null; display_name: string | null }[]
        | null;
      roles: { role: string }[];
    }) => {
      const profileValue = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        id: row.id,
        user_id: row.user_id,
        profiles: profileValue ?? null,
        roles: row.roles ?? [],
      };
    },
  );

  return { data: mapped, error: null };
}

export async function listPendingInvites(
  teamId: string,
): Promise<ServiceResult<Invite[]>> {
  if (!supabase) {
    return { data: [], error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase
    .from("invites")
    .select("id,email,token,expires_at,roles")
    .eq("team_id", teamId)
    .is("accepted_at", null);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as Invite[]) ?? [], error: null };
}

export async function setBaseRole(
  teamMemberId: string,
  baseRole: "member" | "player",
): Promise<ServiceResult<void>> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase.rpc("set_base_role", {
    p_team_member_id: teamMemberId,
    p_role: baseRole,
  });

  if (error) {
    return { data: undefined, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function addExtraRole(
  teamMemberId: string,
  role: string,
): Promise<ServiceResult<void>> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase
    .from("team_member_roles")
    .insert({ team_member_id: teamMemberId, role });

  if (error) {
    return { data: undefined, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function removeExtraRole(
  teamMemberId: string,
  role: string,
): Promise<ServiceResult<void>> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase
    .from("team_member_roles")
    .delete()
    .eq("team_member_id", teamMemberId)
    .eq("role", role);

  if (error) {
    return { data: undefined, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function createInvite(
  teamId: string,
  email: string,
  roles: string[],
): Promise<ServiceResult<boolean>> {
  if (!supabase) {
    return { data: false, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("create_invite", {
    p_team_id: teamId,
    p_email: email.trim(),
    p_roles: roles,
    p_expires_at: expiresAt,
  });

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: Boolean(data), error: null };
}
