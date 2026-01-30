import { useState, useEffect } from "react";
import { useAuth } from "../../auth/useAuth";
import { CollapsibleSection } from "../../../components/ui/CollapsibleSection";
import { Toggle } from "../../../components/ui/Toggle";
import { TeamsDashboard } from "../dashboard/TeamsDashboard";

export function ProfilePage() {
  const { signOut } = useAuth();
  const [menuPosition, setMenuPosition] = useState<"left" | "right">("right");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedPos = localStorage.getItem("menu-position") as "left" | "right";
    if (savedPos) setMenuPosition(savedPos);

    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const togglePosition = (pos: "left" | "right") => {
    setMenuPosition(pos);
    localStorage.setItem("menu-position", pos);
    window.dispatchEvent(new Event("menu-position-change"));
  };

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Perfil
        </h2>
        <div className="mt-6 flex justify-center">
          <div className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 border-4 border-[var(--bg-surface)] shadow-lg">
            <span className="text-4xl">👤</span>
          </div>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          Usuário Boladas
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">Atacante</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[var(--bg-surface)] p-6 shadow-mui">
        {[
          { label: "Pots", value: "66" },
          { label: "Jogos", value: "23" },
          { label: "Assists", value: "54" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {stat.value}
            </div>
            <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard */}
      <TeamsDashboard withPadding={false} />

      {/* Settings Sections */}
      <CollapsibleSection title="Configurações">
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
      </CollapsibleSection>

      <div className="pt-4">
        <button
          onClick={signOut}
          className="w-full rounded-2xl bg-red-500 py-4 font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
