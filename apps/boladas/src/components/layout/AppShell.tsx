import { Outlet } from "react-router-dom";
import { RadialMenu } from "../ui/RadialMenu";
import { useTeams } from "../../features/teams/useTeams";
import { useAuth } from "../../features/auth/useAuth";
import { usePreferences } from "../../features/preferences/usePreferences";

export function AppShell() {
  const { signOut } = useAuth();
  const { memberships } = useTeams();
  const { menuPosition } = usePreferences();
  const activeTeam = memberships[0];

  const iconProps = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const menuItems = [
    {
      id: "profile",
      label: "Perfil",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.9-3.2 4.7-4.8 7.5-4.8s5.6 1.6 7.5 4.8" />
        </svg>
      ),
      path: "/profile",
    },
    {
      id: "settings",
      label: "Configurações",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2.8" />
          <path d="M12 18.7v2.8" />
          <path d="M2.5 12h2.8" />
          <path d="M18.7 12h2.8" />
          <path d="M5.4 5.4l2 2" />
          <path d="M16.6 16.6l2 2" />
          <path d="M18.6 5.4l-2 2" />
          <path d="M7.4 16.6l-2 2" />
        </svg>
      ),
      path: "/settings",
    },
    {
      id: "logout",
      label: "Sair",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M4.5 5.5h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7" />
          <path d="M13.5 12h7" />
          <path d="M18.5 9l3 3-3 3" />
        </svg>
      ),
      onClick: signOut,
    },
  ];

  const backofficeItems = [
    {
      id: "games",
      label: "Jogos",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M4.5 9.5h15" />
          <path d="M7.5 4.5v3" />
          <path d="M16.5 4.5v3" />
          <rect x="4.5" y="6.5" width="15" height="13" rx="2.2" />
          <path d="M9 13h2.5" />
          <path d="M12.5 13H15" />
          <path d="M9 16h2.5" />
          <path d="M12.5 16H15" />
        </svg>
      ),
      path: "/games",
    },
    {
      id: "convocations",
      label: "Convocatórias",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M4.5 13.5v-3a7.5 7.5 0 0 1 15 0v3" />
          <path d="M6.5 13.5h11" />
          <path d="M7.5 16.5h9" />
          <path d="M10 19h4" />
        </svg>
      ),
      path: "/convocations",
    },
    {
      id: "standings",
      label: "Classificação",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M6 19.5h12" />
          <path d="M8 19.5v-6.5" />
          <path d="M12 19.5v-10" />
          <path d="M16 19.5v-4" />
          <path d="M8 10.5h8" />
        </svg>
      ),
      path: "/standings",
      disabled: true,
    },
    {
      id: "stats",
      label: "Estatísticas",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M5 19.5h14" />
          <path d="M7 16l3-3 2.5 2.5L17 11" />
          <path d="M17 11h-3" />
          <path d="M17 11v3" />
        </svg>
      ),
      path: "/stats",
      disabled: true,
    },
    {
      id: "teams",
      label: "Equipas",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
          <path d="M12 3.5l7 3v5.5c0 4.3-2.8 6.9-7 8.5-4.2-1.6-7-4.2-7-8.5V6.5l7-3z" />
          <circle cx="12" cy="10" r="2.2" />
          <path d="M9 14c.8-1 1.8-1.5 3-1.5s2.2.5 3 1.5" />
        </svg>
      ),
      path: "/teams",
    },
  ];

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto px-3 pb-20 pt-3">
        <Outlet context={{ activeTeam }} />
      </main>
      <RadialMenu
        items={menuItems}
        backofficeItems={backofficeItems}
        position={menuPosition}
      />
    </div>
  );
}
