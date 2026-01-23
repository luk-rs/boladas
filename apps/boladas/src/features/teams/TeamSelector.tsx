import { TeamMembership } from "./types";

interface TeamSelectorProps {
  memberships: TeamMembership[];
  activeTeamId: string | null;
  onSelect: (teamId: string) => void;
}

export function TeamSelector({
  memberships,
  activeTeamId,
  onSelect,
}: TeamSelectorProps) {
  if (memberships.length === 0) return null;

  // If no team is active, we might show a list of buttons (like in the original "Select a team" view)
  // If a team IS active, we show the dropdown (like in "Team home")

  if (!activeTeamId) {
    return (
      <section className="card">
        <h2>Select a team</h2>
        <p className="muted">Choose the team you want to view.</p>
        <div className="stack">
          {memberships.map((membership) => (
            <button
              key={membership.teamId}
              className="provider-button"
              onClick={() => onSelect(membership.teamId)}
            >
              {membership.teamName}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="row">
      <h2>Team home</h2>
      <select
        value={activeTeamId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {memberships.map((membership) => (
          <option key={membership.teamId} value={membership.teamId}>
            {membership.teamName}
          </option>
        ))}
      </select>
    </div>
  );
}
