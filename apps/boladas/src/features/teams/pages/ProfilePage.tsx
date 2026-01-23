import { useState, useEffect } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { CollapsibleSection } from "../../../components/ui/CollapsibleSection";

export function ProfilePage() {
  const { signOut, sessionUserId } = useAuth();
  const { memberships } = useTeams(sessionUserId, false);
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

      {/* Teams Section */}
      <CollapsibleSection title="Meus Times" defaultOpen={true}>
        <div className="space-y-3">
          {memberships.length > 0 ? (
            memberships.map((m) => (
              <div
                key={m.teamId}
                className="flex items-center justify-between rounded-xl bg-[var(--bg-app)] p-4 shadow-sm"
              >
                <div>
                  <h5 className="font-semibold text-[var(--text-primary)]">
                    {m.teamName}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">
                    {m.roles.join(", ")}
                  </p>
                </div>
                {/* Future: Add 'Select' or 'Leave' buttons here */}
              </div>
            ))
          ) : (
            <div className="text-center py-4 bg-[var(--bg-app)] rounded-xl border border-dashed border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Você não participa de nenhum time.
              </p>
              <CreateTeamInline />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Settings Sections */}
      <CollapsibleSection title="Configurações">
        <div className="space-y-6">
          {/* Menu Position */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase">
              Acessibilidade: Menu
            </h5>
            <div className="flex gap-2">
              {(["left", "right"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => togglePosition(pos)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                    menuPosition === pos
                      ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                      : "bg-[var(--bg-app)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                  }`}
                >
                  {pos === "left" ? "Esquerdo" : "Direito"}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Settings */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase">
              Aparência
            </h5>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTheme(t)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                    theme === t
                      ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                      : "bg-[var(--bg-app)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                  }`}
                >
                  {t === "light" ? "☀️ Claro" : "🌙 Escuro"}
                </button>
              ))}
            </div>
          </div>
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

function CreateTeamInline() {
  const { createTeam, error } = useTeams(null, false); // userId not needed for hook init, but needed for action. Wait, hook needs userId.
  // Actually, useTeams needs userId to init.
  // Let's get it from useAuth inside the component?
  // No, useTeams shouldn't be re-initialized if we can avoid it, but here it's fine.
  const { sessionUserId } = useAuth();
  const { createTeam: performCreate, status } = useTeams(sessionUserId, false);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await performCreate(name);
    setLoading(false);
    setName("");
    // Reload happens automatically via useTeams subscription usually, or we might need to trigger parent refresh.
    // useTeams has internal state, but parent ProfilePage has its OWN instance of useTeams.
    // For simple implementation, we can force a window reload or context update.
    // Actually, useTeams does not share state across instances (it's a hook, not a context).
    // So the parent list won't update unless we share context.
    // FOR NOW: window.location.reload() is a crude but effective way to sync.
    window.location.reload();
  };

  return (
    <div className="px-4">
      {status && <p className="text-green-500 text-xs mb-2">{status}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome do novo time..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-primary-500 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-50"
        >
          {loading ? "..." : "Criar"}
        </button>
      </div>
    </div>
  );
}
