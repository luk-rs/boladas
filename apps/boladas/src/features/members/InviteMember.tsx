import { useState } from "react";
import { Invite } from "./types";

interface InviteMemberProps {
  invites: Invite[];
  onCreateInvite: (email: string, roles: string[]) => Promise<void>;
}

export function InviteMember({ invites, onCreateInvite }: InviteMemberProps) {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["member"]);

  const handleInvite = () => {
    void onCreateInvite(email, roles);
    setEmail("");
    setRoles(["member"]);
  };

  const toggleRole = (role: string) => {
    setRoles((prev) => {
      if (prev.includes(role)) {
        // Prevent removing the last base role if switching? Logic in original was simple toggle
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  // Helper to ensure base role exclusivity for UI
  const setBaseRole = (role: "member" | "player") => {
    setRoles((prev) => {
      const others = prev.filter((r) => r !== "member" && r !== "player");
      return [...others, role];
    });
  };

  return (
    <div className="stack">
      <h3>Invite Member</h3>
      <div className="row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
        />
        <button onClick={handleInvite}>Invite</button>
      </div>
      <div className="row">
        <label>
          <input
            type="radio"
            checked={roles.includes("member")}
            onChange={() => setBaseRole("member")}
          />
          Member
        </label>
        <label>
          <input
            type="radio"
            checked={roles.includes("player")}
            onChange={() => setBaseRole("player")}
          />
          Player
        </label>
        <label>
          <input
            type="checkbox"
            checked={roles.includes("team_admin")}
            onChange={() => toggleRole("team_admin")}
          />
          Admin
        </label>
      </div>

      {invites.length > 0 && (
        <div className="stack">
          <h4>Pending Invites</h4>
          {invites.map((invite) => (
            <div key={invite.id} className="row">
              <span>{invite.email}</span>
              <span className="muted">
                Expires: {new Date(invite.expires_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
