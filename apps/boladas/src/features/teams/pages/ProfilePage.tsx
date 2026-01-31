import { ProfileDashboard } from "../dashboard/ProfileDashboard";

export function ProfilePage() {
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
      <ProfileDashboard withPadding={false} />
    </div>
  );
}
