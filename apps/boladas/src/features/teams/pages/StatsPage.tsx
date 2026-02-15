import { PageScaffold } from "../../../components/layout/PageScaffold";
import { SectionShell } from "../../../components/layout/SectionShell";
import { SurfaceTile } from "../../../components/layout/SurfaceTile";

export function StatsPage() {
  return (
    <PageScaffold
      title="Estatísticas"
    >
      <SectionShell title="Em breve" variant="strong" bodyClassName="mt-4">
        <SurfaceTile variant="dashed" className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Estamos a montar o painel de métricas.
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Aqui vão aparecer evolução, comparativos e indicadores por jogo.
          </p>
        </SurfaceTile>
      </SectionShell>
    </PageScaffold>
  );
}
