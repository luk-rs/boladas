import { TeamMemberRow } from "./types";

interface MemberListProps {
  members: TeamMemberRow[];
  onSetBaseRole: (id: string, role: "member" | "player") => Promise<void>;
  onToggleExtraRole: (
    id: string,
    role: string,
    hasRole: boolean,
  ) => Promise<void>;
  canManage: boolean;
  currentUserRoles: string[]; // To maybe highlight self?
}

export function MemberList({
  members,
  onSetBaseRole,
  onToggleExtraRole,
  canManage,
}: MemberListProps) {
  if (!canManage) return null; // Or show read-only list? Original showed it under "Team admin" section

  return (
    <div className="stack">
      {members.map((member) => {
        const memberRoles = member.roles.map((r) => r.role);
        const baseRole = memberRoles.includes("player") ? "player" : "member";
        return (
          <div key={member.id} className="row">
            <div className="stack">
              <strong>
                {member.profiles?.display_name || member.profiles?.email}
              </strong>
              <span className="muted">{member.profiles?.email}</span>
            </div>
            <div className="stack">
              <div className="row">
                <span>Base:</span>
                <button
                  onClick={() => onSetBaseRole(member.id, "member")}
                  disabled={memberRoles.includes("member")}
                >
                  Member
                </button>
                <button
                  onClick={() => onSetBaseRole(member.id, "player")}
                  disabled={memberRoles.includes("player")}
                >
                  Player
                </button>
              </div>
              <div className="row">
                <label>
                  <input
                    type="checkbox"
                    checked={memberRoles.includes("team_admin")}
                    onChange={() =>
                      onToggleExtraRole(
                        member.id,
                        "team_admin",
                        memberRoles.includes("team_admin"),
                      )
                    }
                  />
                  Admin
                </label>
                {/* Add other roles as needed */}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
