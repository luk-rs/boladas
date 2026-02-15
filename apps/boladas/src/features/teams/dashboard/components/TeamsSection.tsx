import { MIN_TEAM_MEMBERS } from "../constants";
import { TeamRosterStatus } from "../types";
import { EmojiStack } from "./EmojiStack";
import { SectionShell } from "../../../../components/layout/SectionShell";
import { SurfaceTile } from "../../../../components/layout/SurfaceTile";

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
    <SectionShell title="Equipas e respetivo plantel">
      <div className="space-y-3">
        {loading ? (
          <>
            <SurfaceTile variant="dashed" className="h-14 p-0" />
            <SurfaceTile variant="dashed" className="h-14 p-0" />
          </>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <SurfaceTile
              key={team.id}
              variant="soft"
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="space-y-2">
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
                {team.memberCount >= MIN_TEAM_MEMBERS
                  ? "Completa"
                  : "Incompleta"}
              </span>
            </SurfaceTile>
          ))
        ) : (
          <SurfaceTile
            variant="dashed"
            className="p-4 text-center text-sm text-[var(--text-secondary)]"
          >
            Nenhuma equipa encontrada.
          </SurfaceTile>
        )}
      </div>
    </SectionShell>
  );
}
