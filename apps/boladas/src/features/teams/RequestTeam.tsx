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
      <h2>Pedir criação de equipa</h2>
      <p className="muted">
        Submete um pedido de criação de equipa. Um administrador do sistema tem
        de o aprovar.
      </p>
      <div className="row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da equipa"
        />
        <button onClick={handleSubmit}>Pedir equipa</button>
      </div>
      {myRequests.length > 0 && (
        <div className="stack">
          <h4 className="muted">Os teus pedidos</h4>
          {myRequests.map((req) => (
            <div key={req.id} className="row">
              <span>{req.name}</span>
              <span className="muted">Estado: {req.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
