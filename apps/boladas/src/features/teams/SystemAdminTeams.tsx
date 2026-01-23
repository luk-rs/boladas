import { useState } from "react";
import { Team, TeamRequest } from "./types";

interface SystemAdminTeamsProps {
  allTeams: Team[];
  pendingRequests: TeamRequest[];
  onCreateTeam: (name: string) => Promise<void>;
  onDeleteTeam: (id: string) => Promise<void>;
  onApproveRequest: (id: string) => Promise<void>;
  onDenyRequest: (id: string) => Promise<void>;
}

export function SystemAdminTeams({
  allTeams,
  pendingRequests,
  onCreateTeam,
  onDeleteTeam,
  onApproveRequest,
  onDenyRequest,
}: SystemAdminTeamsProps) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    void onCreateTeam(name);
    setName("");
  };

  return (
    <section className="card">
      <h2>System admin</h2>
      <p className="muted">Manage all teams and approve requests.</p>
      <div className="row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New team name"
        />
        <button onClick={handleCreate}>Create team</button>
      </div>
      <div className="stack">
        {allTeams.map((team) => (
          <div key={team.id} className="row">
            <span>{team.name}</span>
            <button onClick={() => onDeleteTeam(team.id)}>Delete</button>
          </div>
        ))}
      </div>
      <h3>Pending team requests</h3>
      {pendingRequests.length === 0 && <p className="muted">None pending.</p>}
      <div className="stack">
        {pendingRequests.map((req) => (
          <div key={req.id} className="row">
            <div className="stack">
              <strong>{req.name}</strong>
              <span className="muted">Requested by: {req.requested_by}</span>
            </div>
            <div className="row">
              <button onClick={() => onApproveRequest(req.id)}>Approve</button>
              <button onClick={() => onDenyRequest(req.id)}>Deny</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
