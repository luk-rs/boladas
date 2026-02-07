import { Toggle } from "../../../components/ui/Toggle";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Preferências da aplicação
        </p>
      </header>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Preferências
            </p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Ajustes da aplicação
            </h3>
          </div>
          <span className="text-2xl">⚙️</span>
        </header>

        <div className="space-y-4 divide-y divide-[var(--border-color)]">
          <Toggle
            label="Menu à Direita"
            subLabel="Alternar posição do menu radial"
            checked={menuPosition === "right"}
            onChange={(checked) => togglePosition(checked ? "right" : "left")}
            icon="↕️"
          />
          <Toggle
            label="Tema Escuro"
            subLabel="Habilitar aparência escura"
            checked={theme === "dark"}
            onChange={(checked) => toggleTheme(checked ? "dark" : "light")}
            icon={theme === "dark" ? "🌙" : "☀️"}
          />
        </div>
      </section>
    </div>
  );
}
