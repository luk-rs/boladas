import { Outlet } from "react-router-dom";
import { RadialMenu } from "../ui/RadialMenu";
import { useTeams } from "../../features/teams/useTeams";
import { useAuth } from "../../features/auth/useAuth";
import { usePreferences } from "../../features/preferences/usePreferences";

const TEAM_MANAGEMENT_ROLES = new Set(["team_admin", "manager"]);

export function AppShell() {
  const { signOut } = useAuth();
  const { memberships } = useTeams();
  const { menuPosition } = usePreferences();
  const activeTeam = memberships[0];
  const canManageTeams = memberships.some((membership) =>
    membership.roles.some((role) => TEAM_MANAGEMENT_ROLES.has(role)),
  );

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

  const backofficeItems = canManageTeams
    ? [
        {
          id: "team-management",
          label: "Gestão de Time",
          icon: (
            <svg viewBox="0 0 24 24" aria-hidden {...iconProps}>
              <path d="M12 3.5l7 3v5.5c0 4.3-2.8 6.9-7 8.5-4.2-1.6-7-4.2-7-8.5V6.5l7-3z" />
              <circle cx="12" cy="10" r="2.2" />
              <path d="M9 14c.8-1 1.8-1.5 3-1.5s2.2.5 3 1.5" />
            </svg>
          ),
          path: "/team-management",
        },
      ]
    : undefined;

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto p-4 pb-24">
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
