import { useState } from "react";
import { TeamRequest } from "./types";

interface RequestTeamProps {
  onRequest: (name: string) => Promise<void>;
  myRequests: TeamRequest[];
}

export function RequestTeam({ onRequest, myRequests }: RequestTeamProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    void onRequest(name);
    setName("");
  };

  return (
    <section className="card">
      <h2>Request a team</h2>
      <p className="muted">
        Submit a team creation request. A system admin must approve it.
      </p>
      <div className="row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Team name"
        />
        <button onClick={handleSubmit}>Request team</button>
      </div>
      {myRequests.length > 0 && (
        <div className="stack">
          <h4 className="muted">Your requests</h4>
          {myRequests.map((req) => (
            <div key={req.id} className="row">
              <span>{req.name}</span>
              <span className="muted">Status: {req.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
