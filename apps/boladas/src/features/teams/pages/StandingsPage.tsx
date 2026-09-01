import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { SectionShell } from "../../../shared/layout/SectionShell";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";

export function StandingsPage() {
  return (
    <PageScaffold title="Classificação">
      <SectionShell title="Em breve" variant="strong" bodyClassName="mt-4">
        <SurfaceTile variant="dashed" className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Esta área está a ser preparada.
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Em breve vais ver ranking completo por equipa, pontos e desempenho.
          </p>
        </SurfaceTile>
      </SectionShell>
    </PageScaffold>
  );
}
