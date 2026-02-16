import { useState, useCallback, useEffect } from "react";
import { TeamMemberRow, Invite } from "./types";
import {
  addExtraRole,
  createInvite,
  listPendingInvites,
  listTeamMembers,
  removeExtraRole,
  setBaseRole,
} from "./services/members.service";

export function useMembers(teamId: string | null) {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!teamId) return;

    const result = await listTeamMembers(teamId);
    if (result.error) {
      setError(result.error);
      return;
    }

    setMembers(result.data);
  }, [teamId]);

  const loadInvites = useCallback(async () => {
    if (!teamId) return;

    const result = await listPendingInvites(teamId);
    if (result.error) {
      setError(result.error);
      return;
    }

    setInvites(result.data);
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

  const setBaseRoleAction = async (
    teamMemberId: string,
    baseRole: "member" | "player",
  ) => {
    setError(null);

    const result = await setBaseRole(teamMemberId, baseRole);
    if (result.error) {
      setError(result.error);
      return;
    }

    await loadMembers();
  };

  const toggleExtraRole = async (
    teamMemberId: string,
    role: string,
    hasRole: boolean,
  ) => {
    setError(null);

    const result = hasRole
      ? await removeExtraRole(teamMemberId, role)
      : await addExtraRole(teamMemberId, role);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadMembers();
  };

  const createInviteAction = async (email: string, roles: string[]) => {
    if (!teamId) return;

    setError(null);
    setStatus(null);

    if (!email.trim()) {
      setError("O email do convite é obrigatório.");
      return;
    }
    if (!roles.includes("member") && !roles.includes("player")) {
      setError("O convite tem de incluir um papel base (membro ou jogador).");
      return;
    }
    if (roles.includes("member") && roles.includes("player")) {
      setError("O convite só pode incluir um papel base.");
      return;
    }

    const result = await createInvite(teamId, email, roles);
    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus("Convite criado.");
    if (result.data) {
      await loadInvites();
    }
  };

  return {
    members,
    invites,
    error,
    status,
    setBaseRole: setBaseRoleAction,
    toggleExtraRole,
    createInvite: createInviteAction,
  };
}
