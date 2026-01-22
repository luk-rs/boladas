import { useEffect, useMemo, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Role = {
  name: string;
  kind: "base" | "extra";
};


type TeamMembership = {
  teamMemberId: string;
  teamId: string;
  teamName: string;
  roles: string[];
};

type TeamMemberRow = {
  id: string;
  user_id: string;
  profiles?: { email: string | null; display_name: string | null } | null;
  roles: { role: string }[];
};

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
const LAST_TEAM_KEY = "boladas:last_team_id";

const providerButtons: { id: Provider; label: string; icon: string }[] = [
  { id: "google", label: "Google", icon: "/assets/providers/google.svg" },
  { id: "facebook", label: "Meta", icon: "/assets/providers/facebook.svg" },
  { id: "azure", label: "Microsoft", icon: "/assets/providers/microsoft.svg" },
  { id: "apple", label: "Apple", icon: "/assets/providers/apple.svg" },
];

export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [teamInvites, setTeamInvites] = useState<
    { id: string; email: string; token: string; expires_at: string; roles: string[] }[]
  >([]);
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([]);
  const [systemTeamName, setSystemTeamName] = useState("");
  const [teamNameInput, setTeamNameInput] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<string[]>(["member"]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  }, []);

  const isAuthed = Boolean(sessionUserId);
  const activeMembership = memberships.find((m) => m.teamId === activeTeamId) ?? null;
  const activeTeamName = activeMembership?.teamName ?? "";
  const isTeamAdmin = activeMembership?.roles.includes("team_admin") ?? false;
  const canManageTeam = isSystemAdmin || isTeamAdmin;

  const pollingUrl = useMemo(() => `${apiUrl.replace(/\/$/, "")}/random`, []);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();
    const media = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkInstalled();
    media.addEventListener?.("change", handleChange);
    window.addEventListener("appinstalled", checkInstalled);

    return () => {
      media.removeEventListener?.("change", handleChange);
      window.removeEventListener("appinstalled", checkInstalled);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
      setSessionUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    const upsertProfile = async () => {
      const { data: userData } = await client.auth.getUser();
      const user = userData.user;
      if (!user) return;
      await client.from("profiles").upsert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      });
    };
    void upsertProfile();
  }, [sessionUserId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    const loadProfile = async () => {
      const { data, error: profileError } = await client
        .from("profiles")
        .select("is_system_admin")
        .eq("id", sessionUserId)
        .maybeSingle();
      if (profileError) {
        setError(profileError.message);
        return;
      }
      setIsSystemAdmin(Boolean(data?.is_system_admin));
    };
    void loadProfile();
  }, [sessionUserId]);

  const loadMemberships = async () => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    const { data, error: fetchError } = await client
      .from("team_members")
      .select("id, team_id, team:teams(id,name), roles:team_member_roles(role)")
      .eq("user_id", sessionUserId);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    const mapped = (data ?? []).map((row) => {
      const team = Array.isArray(row.team) ? row.team[0] : row.team;
      return {
        teamMemberId: row.id,
        teamId: row.team_id,
        teamName: team?.name ?? "Team",
        roles: (row.roles ?? []).map((r) => r.role),
      };
    });
    setMemberships(mapped);

    const storedTeam = localStorage.getItem(LAST_TEAM_KEY);
    if (storedTeam && mapped.some((m) => m.teamId === storedTeam)) {
      setActiveTeamId(storedTeam);
    } else if (mapped.length === 1) {
      setActiveTeamId(mapped[0].teamId);
    }
  };

  const loadRoles = async () => {
    const client = supabase;
    if (!client) return;
    const { data, error: rolesError } = await client.from("roles").select("*");
    if (rolesError) {
      setError(rolesError.message);
      return;
    }
    setRoles((data ?? []) as Role[]);
  };
  const loadAllTeams = async () => {
    const client = supabase;
    if (!client) return;
    const { data, error: teamsError } = await client.from("teams").select("id,name");
    if (teamsError) {
      setError(teamsError.message);
      return;
    }
    setAllTeams(data ?? []);
  };

  const loadTeamMembers = async (teamId: string) => {
    const client = supabase;
    if (!client) return;
    const { data, error: memberError } = await client
      .from("team_members")
      .select("id, user_id, profiles:profiles(email,display_name), roles:team_member_roles(role)")
      .eq("team_id", teamId);
    if (memberError) {
      setError(memberError.message);
      return;
    }
    const mappedMembers: TeamMemberRow[] = (data ?? []).map((row: any) => {
      const profileValue = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        user_id: row.user_id,
        profiles: profileValue ?? null,
        roles: row.roles ?? [],
      };
    });
    setTeamMembers(mappedMembers);
  };

  const loadInvites = async (teamId: string) => {
    const client = supabase;
    if (!client) return;
    const { data, error: inviteError } = await client
      .from("invites")
      .select("id,email,token,expires_at,roles")
      .eq("team_id", teamId)
      .is("accepted_at", null);
    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    setTeamInvites(data ?? []);
  };

  useEffect(() => {
    if (!sessionUserId) return;
    void loadMemberships();
    void loadRoles();
  }, [sessionUserId]);
  useEffect(() => {
    if (!isSystemAdmin) {
      setAllTeams([]);
      return;
    }
    void loadAllTeams();
  }, [isSystemAdmin]);

  useEffect(() => {
    if (!activeTeamId || !canManageTeam) {
      setTeamMembers([]);
      setTeamInvites([]);
      return;
    }
    void loadTeamMembers(activeTeamId);
    void loadInvites(activeTeamId);
  }, [activeTeamId, canManageTeam]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setCanInstall(false);
  };

  const signInWithProvider = async (provider: Provider) => {
    const client = supabase;
    if (!client) return;
    const redirectTo = inviteToken
      ? `${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}`
      : window.location.origin;
    await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  };

  const signOut = async () => {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
    setActiveTeamId(null);
    localStorage.removeItem(LAST_TEAM_KEY);
  };

  const createTeam = async () => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    setError(null);
    setStatus(null);
    if (!teamNameInput.trim()) {
      setError("Team name is required.");
      return;
    }
    const { data: teamData, error: teamError } = await client
      .from("teams")
      .insert({ name: teamNameInput.trim(), created_by: sessionUserId })
      .select("id,name")
      .single();
    if (teamError || !teamData) {
      setError(teamError?.message ?? "Failed to create team.");
      return;
    }
    const { data: memberData, error: memberError } = await client
      .from("team_members")
      .insert({ team_id: teamData.id, user_id: sessionUserId })
      .select("id")
      .single();
    if (memberError || !memberData) {
      setError(memberError?.message ?? "Failed to create team membership.");
      return;
    }
    const { error: roleError } = await client.from("team_member_roles").insert([
      { team_member_id: memberData.id, role: "member" },
      { team_member_id: memberData.id, role: "team_admin" },
    ]);
    if (roleError) {
      setError(roleError.message);
      return;
    }
    setTeamNameInput("");
    setStatus("Team created.");
    await loadMemberships();
    setActiveTeamId(teamData.id);
    localStorage.setItem(LAST_TEAM_KEY, teamData.id);
  };

  const createSystemTeam = async () => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    setError(null);
    setStatus(null);
    if (!systemTeamName.trim()) {
      setError("Team name is required.");
      return;
    }
    const { error: teamError } = await client
      .from("teams")
      .insert({ name: systemTeamName.trim(), created_by: sessionUserId });
    if (teamError) {
      setError(teamError.message);
      return;
    }
    setSystemTeamName("");
    setStatus("Team created.");
    await loadAllTeams();
  };

  const deleteTeam = async (teamId: string) => {
    const client = supabase;
    if (!client) return;
    const { error: deleteError } = await client.from("teams").delete().eq("id", teamId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAllTeams();
  };

  const acceptInvite = async () => {
    const client = supabase;
    if (!client || !inviteToken) return;
    setError(null);
    const { data, error: acceptError } = await client.rpc("accept_invite", {
      p_token: inviteToken,
    });
    if (acceptError) {
      setError(acceptError.message);
      return;
    }
    if (data) {
      setActiveTeamId(data);
      localStorage.setItem(LAST_TEAM_KEY, data);
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.toString());
      await loadMemberships();
    }
  };

  useEffect(() => {
    if (inviteToken && isAuthed) {
      void acceptInvite();
    }
  }, [inviteToken, isAuthed]);

  const setBaseRole = async (teamMemberId: string, baseRole: "member" | "player") => {
    const client = supabase;
    if (!client) return;
    const { error: setRoleError } = await client.rpc("set_base_role", {
      p_team_member_id: teamMemberId,
      p_role: baseRole,
    });
    if (setRoleError) {
      setError(setRoleError.message);
      return;
    }
    await loadMemberships();
    if (activeTeamId) {
      await loadTeamMembers(activeTeamId);
    }
  };

  const toggleExtraRole = async (teamMemberId: string, role: string, hasRole: boolean) => {
    const client = supabase;
    if (!client) return;
    if (hasRole) {
      const { error: deleteError } = await client
        .from("team_member_roles")
        .delete()
        .eq("team_member_id", teamMemberId)
        .eq("role", role);
      if (deleteError) setError(deleteError.message);
    } else {
      const { error: insertError } = await client
        .from("team_member_roles")
        .insert({ team_member_id: teamMemberId, role });
      if (insertError) setError(insertError.message);
    }
    if (activeTeamId) {
      await loadTeamMembers(activeTeamId);
      await loadMemberships();
    }
  };

  const createInvite = async () => {
    const client = supabase;
    if (!client || !activeTeamId) return;
    setError(null);
    setStatus(null);
    if (!inviteEmail.trim()) {
      setError("Invite email is required.");
      return;
    }
    if (!inviteRoles.includes("member") && !inviteRoles.includes("player")) {
      setError("Invite must include base role (member or player).");
      return;
    }
    if (inviteRoles.includes("member") && inviteRoles.includes("player")) {
      setError("Invite can include only one base role.");
      return;
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: inviteError } = await client.rpc("create_invite", {
      p_team_id: activeTeamId,
      p_email: inviteEmail.trim(),
      p_roles: inviteRoles,
      p_expires_at: expiresAt,
    });
    if (inviteError) {
      setError(inviteError.message);
      return;
    }
    setInviteEmail("");
    setStatus("Invite created.");
    if (data) {
      setTeamInvites((prev) => [data, ...prev]);
    }
  };

  const handleTeamSelection = (teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem(LAST_TEAM_KEY, teamId);
  };

  const updateInviteRoles = (role: string) => {
    setInviteRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  useEffect(() => {
    if (!isInstalled || !isAuthed) {
      setError(null);
      return;
    }
    let isMounted = true;
    const fetchRandom = async () => {
      try {
        const res = await fetch(pollingUrl);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as { value: number; timestamp: string };
        if (isMounted) {
          setStatus(`API ok: ${data.value} at ${data.timestamp}`);
        }
      } catch (err) {
        if (isMounted) setError((err as Error).message);
      }
    };
    void fetchRandom();
    return () => {
      isMounted = false;
    };
  }, [pollingUrl, isInstalled, isAuthed]);

  return (
    <div className="page">
      <header className="header">
        <h1>Boladas</h1>
        <p>Team-based auth + Supabase</p>
      </header>

      {!isInstalled && (
        <section className="card install">
          <h2>Install</h2>
          <p className="muted">Install the app to continue.</p>
          {canInstall && installPrompt ? (
            <button onClick={handleInstall}>Install app</button>
          ) : (
            <div className="install-guide">
              <img
                src="/assets/install/install-guide.svg"
                alt="Install guidance"
                className="install-image"
              />
              <p className="muted">
                Use your browser menu to add this app to your home screen.
              </p>
            </div>
          )}
        </section>
      )}

      {isInstalled && !isAuthed && (
        <section className="card auth">
          <h2>{inviteToken ? "Accept invite" : "Sign in"}</h2>
          {!supabase && (
            <p className="error">Supabase not configured. Set env vars.</p>
          )}
          {supabase && (
            <>
              <p className="muted">
                {inviteToken
                  ? "Sign in to accept your invite."
                  : "Sign in with one of the providers below."}
              </p>
              <div className="providers-grid">
                {providerButtons.map((provider) => (
                  <button
                    key={provider.id}
                    className="provider-button"
                    onClick={() => signInWithProvider(provider.id)}
                  >
                    <img src={provider.icon} alt={provider.label} />
                    <span>{provider.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {isInstalled && isAuthed && (
        <section className="card">
          <div className="row">
            <h2>{activeTeamName || "Account"}</h2>
            <button onClick={signOut}>Sign out</button>
          </div>
          <p className="muted">Signed in as {sessionEmail}</p>
          {status && <p className="muted">{status}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {isInstalled && isAuthed && memberships.length === 0 && (
        <section className="card">
          <h2>Create a team</h2>
          <p className="muted">Registration is only allowed for teams.</p>
          <div className="row">
            <input
              value={teamNameInput}
              onChange={(event) => setTeamNameInput(event.target.value)}
              placeholder="Team name"
            />
            <button onClick={createTeam}>Create team</button>
          </div>
        </section>
      )}
      {isInstalled && isAuthed && memberships.length > 0 && !activeTeamId && (
        <section className="card">
          <h2>Select a team</h2>
          <p className="muted">Choose the team you want to view.</p>
          <div className="stack">
            {memberships.map((membership) => (
              <button
                key={membership.teamId}
                className="provider-button"
                onClick={() => handleTeamSelection(membership.teamId)}
              >
                {membership.teamName}
              </button>
            ))}
          </div>
        </section>
      )}

      {isInstalled && isAuthed && isSystemAdmin && (
        <section className="card">
          <h2>System admin</h2>
          <p className="muted">Manage all teams.</p>
          <div className="row">
            <input
              value={systemTeamName}
              onChange={(event) => setSystemTeamName(event.target.value)}
              placeholder="New team name"
            />
            <button onClick={createSystemTeam}>Create team</button>
          </div>
          <div className="stack">
            {allTeams.map((team) => (
              <div key={team.id} className="row">
                <span>{team.name}</span>
                <button onClick={() => deleteTeam(team.id)}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}
      {isInstalled && isAuthed && activeTeamId && (
        <section className="card">
          <div className="row">
            <h2>Team home</h2>
            <select
              value={activeTeamId}
              onChange={(event) => handleTeamSelection(event.target.value)}
            >
              {memberships.map((membership) => (
                <option key={membership.teamId} value={membership.teamId}>
                  {membership.teamName}
                </option>
              ))}
            </select>
          </div>
          <p className="muted">Roles: {activeMembership?.roles.join(", ") || "-"}</p>
          {activeMembership && (
            <div className="row">
              <span>Base role:</span>
              <button
                onClick={() => setBaseRole(activeMembership.teamMemberId, "member")}
                disabled={activeMembership.roles.includes("member")}
              >
                Member
              </button>
              <button
                onClick={() => setBaseRole(activeMembership.teamMemberId, "player")}
                disabled={activeMembership.roles.includes("player")}
              >
                Player
              </button>
            </div>
          )}
        </section>
      )}

      {isInstalled && isAuthed && canManageTeam && activeTeamId && (
        <section className="card">
          <h2>Team admin</h2>
          <p className="muted">Manage members, roles, and invites.</p>
          <h3>Members</h3>
          <div className="stack">
            {teamMembers.map((member) => {
              const memberRoles = member.roles.map((r) => r.role);
              const baseRole = memberRoles.includes("player") ? "player" : "member";
              return (
                <div key={member.id} className="row">
                  <div className="stack">
                    <strong>{member.profiles?.display_name || member.profiles?.email}</strong>
                    <span className="muted">{member.profiles?.email}</span>
                  </div>
                  <div className="stack">
                    <div className="row">
                      <span>Base:</span>
                      <button
                        onClick={() => setBaseRole(member.id, "member")}
                        disabled={baseRole === "member"}
                      >
                        Member
                      </button>
                      <button
                        onClick={() => setBaseRole(member.id, "player")}
                        disabled={baseRole === "player"}
                      >
                        Player
                      </button>
                    </div>
                    <div className="row">
                      {roles
                        .filter((role) => role.kind === "extra")
                        .map((role) => (
                          <label key={role.name} className="muted">
                            <input
                              type="checkbox"
                              checked={memberRoles.includes(role.name)}
                              onChange={() =>
                                toggleExtraRole(
                                  member.id,
                                  role.name,
                                  memberRoles.includes(role.name),
                                )
                              }
                            />
                            {role.name}
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3>Invites</h3>
          <div className="stack">
            <div className="row">
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Invite email"
              />
              <button onClick={createInvite}>Create invite</button>
            </div>
            <div className="row">
              {roles.map((role) => (
                <label key={role.name} className="muted">
                  <input
                    type="checkbox"
                    checked={inviteRoles.includes(role.name)}
                    onChange={() => updateInviteRoles(role.name)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
            {teamInvites.length > 0 && (
              <div className="stack">
                {teamInvites.map((invite) => (
                  <div key={invite.id} className="row">
                    <div className="stack">
                      <strong>{invite.email}</strong>
                      <span className="muted">Roles: {invite.roles.join(", ")}</span>
                      <span className="muted">Expires: {invite.expires_at}</span>
                    </div>
                    <div className="stack">
                      <span className="muted">Token</span>
                      <code>{invite.token}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
