import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { TeamMemberRow, Invite } from "./types";

export function useMembers(teamId: string | null) {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!supabase || !teamId) return;
    const { data, error: memberError } = await supabase
      .from("team_members")
      .select(
        "id, user_id, profiles:profiles(email,display_name), roles:team_member_roles(role)",
      )
      .eq("team_id", teamId);

    if (memberError) {
      setError(memberError.message);
      return;
    }

    const mappedMembers: TeamMemberRow[] = (data ?? []).map((row: any) => {
      const profileValue = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        id: row.id,
        user_id: row.user_id,
        profiles: profileValue ?? null,
        roles: row.roles ?? [],
      };
    });
    setMembers(mappedMembers);
  }, [teamId]);

  const loadInvites = useCallback(async () => {
    if (!supabase || !teamId) return;
    const { data, error: inviteError } = await supabase
      .from("invites")
      .select("id,email,token,expires_at,roles")
      .eq("team_id", teamId)
      .is("accepted_at", null);

    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    setInvites(data ?? []);
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      void loadMembers();
      void loadInvites();
    } else {
      setMembers([]);
      setInvites([]);
    }
  }, [teamId, loadMembers, loadInvites]);

  const setBaseRole = async (
    teamMemberId: string,
    baseRole: "member" | "player",
  ) => {
    if (!supabase) return;
    setError(null);
    const { error: setRoleError } = await supabase.rpc("set_base_role", {
      p_team_member_id: teamMemberId,
      p_role: baseRole,
    });
    if (setRoleError) setError(setRoleError.message);
    else await loadMembers();
  };

  const toggleExtraRole = async (
    teamMemberId: string,
    role: string,
    hasRole: boolean,
  ) => {
    if (!supabase) return;
    setError(null);
    if (hasRole) {
      const { error: deleteError } = await supabase
        .from("team_member_roles")
        .delete()
        .eq("team_member_id", teamMemberId)
        .eq("role", role);
      if (deleteError) setError(deleteError.message);
    } else {
      const { error: insertError } = await supabase
        .from("team_member_roles")
        .insert({ team_member_id: teamMemberId, role });
      if (insertError) setError(insertError.message);
    }
    await loadMembers();
  };

  const createInvite = async (email: string, roles: string[]) => {
    if (!supabase || !teamId) return;
    setError(null);
    setStatus(null);
    if (!email.trim()) {
      setError("Invite email is required.");
      return;
    }
    if (!roles.includes("member") && !roles.includes("player")) {
      setError("Invite must include base role (member or player).");
      return;
    }
    if (roles.includes("member") && roles.includes("player")) {
      setError("Invite can include only one base role.");
      return;
    }

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error: inviteError } = await supabase.rpc("create_invite", {
      p_team_id: teamId,
      p_email: email.trim(),
      p_roles: roles,
      p_expires_at: expiresAt,
    });

    if (inviteError) {
      setError(inviteError.message);
      return;
    }

    setStatus("Invite created.");
    if (data) {
      // Optimistic update or just reload
      await loadInvites();
    }
  };

  return {
    members,
    invites,
    error,
    status,
    setBaseRole,
    toggleExtraRole,
    createInvite,
  };
}
