import { MIN_TEAM_MEMBERS } from "../constants";
import { TeamRosterStatus } from "../types";
import { EmojiStack } from "./EmojiStack";

export type TeamsSectionProps = {
  teams: TeamRosterStatus[];
  loading: boolean;
  activeTooltipId: string | null;
  onTooltipChange: (id: string | null) => void;
};

export function TeamsSection({
  teams,
  loading,
  activeTooltipId,
  onTooltipChange,
}: TeamsSectionProps) {
  return (
    <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Equipas
          </p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Equipas e respetivo plantel
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Mínimo de 10 jogadores
          </p>
        </div>
        <span className="text-2xl">🧩</span>
      </header>
      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
            <div className="h-14 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
          </>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between rounded-xl bg-[var(--bg-app)] px-4 py-3"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {team.name}
                </p>
                {team.memberCount === 0 ? (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Sem jogadores
                  </span>
                ) : (
                  <EmojiStack
                    items={team.members}
                    showTooltip
                    activeTooltipId={activeTooltipId}
                    onTooltipChange={onTooltipChange}
                  />
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  team.memberCount >= MIN_TEAM_MEMBERS
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                }`}
              >
                {team.memberCount >= MIN_TEAM_MEMBERS ? "Completa" : "Incompleta"}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-4 text-center text-sm text-[var(--text-secondary)]">
            Nenhuma equipa encontrada.
          </div>
        )}
      </div>
    </section>
  );
}
