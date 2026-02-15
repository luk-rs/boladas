import { useState } from "react";
import { Team, TeamRequest } from "./types";
import { SectionShell } from "../../components/layout/SectionShell";
import { SurfaceTile } from "../../components/layout/SurfaceTile";

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
    if (!name.trim()) return;
    void onCreateTeam(name.trim());
    setName("");
  };

  return (
    <div className="space-y-6">
      <SectionShell title="Equipas" variant="strong">
        <div className="space-y-3">
          <SurfaceTile
            variant="strong"
            className="flex items-center gap-2 px-3 py-3"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New team name"
              className="h-10 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-primary-400"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim()}
              className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all active:scale-95 disabled:opacity-60"
            >
              Criar
            </button>
          </SurfaceTile>

          {allTeams.length === 0 ? (
            <SurfaceTile
              variant="dashed"
              className="p-4 text-center text-sm text-[var(--text-secondary)]"
            >
              Nenhuma equipa encontrada.
            </SurfaceTile>
          ) : (
            allTeams.map((team) => (
              <SurfaceTile
                key={team.id}
                variant="soft"
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {team.name}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteTeam(team.id)}
                  className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                >
                  Apagar
                </button>
              </SurfaceTile>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell title="Pending team requests" variant="strong">
        {pendingRequests.length === 0 ? (
          <SurfaceTile
            variant="dashed"
            className="p-4 text-center text-sm text-[var(--text-secondary)]"
          >
            None pending.
          </SurfaceTile>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <SurfaceTile key={req.id} variant="soft" className="space-y-3 p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {req.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Requested by: {req.requested_by}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onApproveRequest(req.id)}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition-all active:scale-95"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDenyRequest(req.id)}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                  >
                    Negar
                  </button>
                </div>
              </SurfaceTile>
            ))}
          </div>
        )}
      </SectionShell>
    </div>
  );
}
