import { Toggle } from "../../../shared/ui/Toggle";
import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { SectionShell } from "../../../shared/layout/SectionShell";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import {
  usePreferences,
  type MenuPosition,
  type ThemeMode,
} from "../../preferences/usePreferences";

export function SettingsPage() {
  const { menuPosition, setMenuPosition, theme, setTheme } = usePreferences();

  const togglePosition = (position: MenuPosition) => {
    setMenuPosition(position);
  };

  const toggleTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
  };

  return (
    <PageScaffold title="Definições">
      <SectionShell title="Definições da aplicação">
        <SurfaceTile
          variant="strong"
          className="space-y-4 divide-y divide-[var(--border-color)] p-4"
        >
          <Toggle
            label="Menu à direita"
            subLabel="Alternar posição do menu radial"
            checked={menuPosition === "right"}
            onChange={(checked) => togglePosition(checked ? "right" : "left")}
            icon="↕️"
          />
          <Toggle
            label="Tema escuro"
            subLabel="Ativar tema escuro"
            checked={theme === "dark"}
            onChange={(checked) => toggleTheme(checked ? "dark" : "light")}
            icon={theme === "dark" ? "🌙" : "☀️"}
          />
        </SurfaceTile>
      </SectionShell>
    </PageScaffold>
  );
}
