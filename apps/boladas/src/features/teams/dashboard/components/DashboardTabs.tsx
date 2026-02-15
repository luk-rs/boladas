import { SurfaceTile } from "../../../../components/layout/SurfaceTile";

export type DashboardTabId = "games" | "convocations" | "teams";

type TabDef = {
  id: DashboardTabId;
  label: string;
  icon: string;
};

const TABS: TabDef[] = [
  { id: "games", label: "Jogos", icon: "🏟️" },
  { id: "convocations", label: "Convocatórias", icon: "📣" },
  { id: "teams", label: "Equipas", icon: "🧩" },
];

export type DashboardTabsProps = {
  value: DashboardTabId;
  onChange: (value: DashboardTabId) => void;
  className?: string;
};

export function DashboardTabs({
  value,
  onChange,
  className = "",
}: DashboardTabsProps) {
  return (
    <SurfaceTile
      variant="strong"
      className={`rounded-full p-1 shadow-sm ${className}`}
      role="tablist"
      aria-label="Dashboard"
    >
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.99] ${
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-[var(--text-primary)] opacity-75 hover:opacity-100"
              }`}
              onClick={() => onChange(tab.id)}
            >
              <span className="text-base" aria-hidden>
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </SurfaceTile>
  );
}
