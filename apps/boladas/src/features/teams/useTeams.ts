import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { TeamMembership, TeamRequest, Team } from "./types";

const LAST_TEAM_KEY = "boladas:last_team_id";

export function useTeams(userId: string | null, isSystemAdmin: boolean) {
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<TeamRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamRequest[]>([]); // Admin only
  const [allTeams, setAllTeams] = useState<Team[]>([]); // Admin only
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadMemberships = useCallback(async () => {
    // console.log("🔄 Loading Memberships for:", userId);
    if (!supabase || !userId) return;

    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("id, team_id, team:teams(id,name), roles:team_member_roles(role)")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("❌ Error loading memberships:", fetchError);
      setError(fetchError.message);
      return;
    }

    const mapped = (data ?? []).map((row) => {
      const team = Array.isArray(row.team) ? row.team[0] : row.team;
      return {
        teamMemberId: row.id,
        teamId: row.team_id,
        teamName: team?.name ?? "Team",
        roles: (row.roles ?? []).map((r: any) => r.role),
      };
    });
    setMemberships(mapped);

    // Only set active team IF it was passed or logic requires it, but for now we want to start with NO active team
    // unless there is strictly only one? NO, user wants list even then likely.
    // Retaining logic: if 1 team, maybe auto-select?
    // User said: "just list them to me". So NO auto-select.
    // However, I will keep the state management, just remove the localStorage init.

    // if (!activeTeamId && mapped.length === 1) {
    //   setActiveTeamId(mapped[0].teamId);
    // }
    // Actually, forcing list view even for 1 team seems to be the request.
  }, [userId, activeTeamId]);

  const loadMyRequests = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from("team_requests")
      .select("*")
      .eq("requested_by", userId);
    if (error) setError(error.message);
    else setMyRequests(data ?? []);
  }, [userId]);

  const loadAdminData = useCallback(async () => {
    if (!supabase || !isSystemAdmin) return;

    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id,name");
    if (teamsError) setError(teamsError.message);
    else setAllTeams(teams ?? []);

    const { data: reqs, error: reqsError } = await supabase
      .from("team_requests")
      .select("*")
      .eq("status", "pending");
    if (reqsError) setError(reqsError.message);
    else setPendingRequests(reqs ?? []);
  }, [isSystemAdmin]);

  useEffect(() => {
    if (userId) {
      void loadMemberships();
      void loadMyRequests();
    }
  }, [userId, loadMemberships, loadMyRequests]);

  useEffect(() => {
    if (isSystemAdmin) {
      void loadAdminData();
    }
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
      .insert({ name: name.trim(), created_by: userId })
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
      ]);

    if (roleError) {
      setError(roleError.message);
      return;
    }

    setStatus("Team created.");
    await loadMemberships();
    // Do NOT auto-select. Let user see list.
    // setActiveTeamId(teamData.id);
  };

  const requestTeam = async (name: string) => {
    if (!supabase) return;
    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    const { error: reqError } = await supabase.rpc("create_team_request", {
      p_name: name.trim(),
    });
    if (reqError) setError(reqError.message);
    else {
      setStatus("Request submitted.");
      await loadMyRequests();
    }
  };

  const handleTeamSelection = (teamId: string) => {
    setActiveTeamId(teamId);
    // No localStorage
  };

  // Admin functions
  const createSystemTeam = async (name: string) => {
    if (!supabase || !userId) return;
    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    const { error: teamError } = await supabase
      .from("teams")
      .insert({ name: name.trim(), created_by: userId });
    if (teamError) setError(teamError.message);
    else {
      setStatus("Team created.");
      await loadAdminData();
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) setError(error.message);
    else await loadAdminData();
  };

  const approveRequest = async (requestId: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("approve_team_request", {
      p_request_id: requestId,
    });
    if (error) setError(error.message);
    else {
      setStatus("Request approved.");
      await loadAdminData();
      await loadMemberships(); // In case the admin is the one who requested it (edge case) or if it affects them
    }
  };

  const denyRequest = async (requestId: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("deny_team_request", {
      p_request_id: requestId,
    });
    if (error) setError(error.message);
    else {
      setStatus("Request denied.");
      await loadAdminData();
    }
  };

  const acceptInvite = async (token: string) => {
    if (!supabase) return;
    setError(null);
    const { data, error: acceptError } = await supabase.rpc("accept_invite", {
      p_token: token,
    });
    if (acceptError) {
      setError(acceptError.message);
      return;
    }
    if (data) {
      setActiveTeamId(data);
      localStorage.setItem(LAST_TEAM_KEY, data);
      await loadMemberships();
      return data;
    }
  };

  return {
    memberships,
    activeTeamId,
    myRequests,
    pendingRequests,
    allTeams,
    error,
    status,
    createTeam,
    requestTeam,
    voteTeam: handleTeamSelection, // Renaming for clarity if needed, but handleTeamSelection is fine
    setActiveTeamId: (id: string | null) => {
      if (id) {
        setActiveTeamId(id);
        // No localStorage
      } else {
        setActiveTeamId(null);
      }
    },
    createSystemTeam,
    deleteTeam,
    approveRequest,
    denyRequest,
    acceptInvite,
  };
}
