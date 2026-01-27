import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { RadialMenu } from "../ui/RadialMenu";
import { TopBar } from "./TopBar";
import { useTeams } from "../../features/teams/useTeams";
import { useAuth } from "../../features/auth/useAuth";

export function AppShell() {
  const { sessionUserId, isSystemAdmin } = useAuth();
  const { memberships } = useTeams(sessionUserId, isSystemAdmin);
  const activeTeam = memberships[0];
  const title = activeTeam?.teamName ?? "Boladas";

  const [menuPosition, setMenuPosition] = useState<"left" | "right">("right");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Load initial preferences
    const savedPos = localStorage.getItem("menu-position") as "left" | "right";
    if (savedPos) setMenuPosition(savedPos);

    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Listen for position changes
    const handlePosChange = () => {
      const saved = localStorage.getItem("menu-position") as "left" | "right";
      if (saved) setMenuPosition(saved);
    };

    // Listen for theme changes
    const handleThemeChange = () => {
      const saved = localStorage.getItem("theme") as "light" | "dark";
      if (saved) {
        setTheme(saved);
        document.documentElement.classList.toggle("dark", saved === "dark");
      }
    };

    window.addEventListener("menu-position-change", handlePosChange);
    window.addEventListener("theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("menu-position-change", handlePosChange);
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);

  const menuItems = [
    { id: "games", label: "Jogos", icon: "📅", path: "/games", disabled: true },
    {
      id: "standings",
      label: "Classificação",
      icon: "🏆",
      path: "/standings",
      disabled: true,
    },
    {
      id: "stats",
      label: "Estatísticas",
      icon: "📊",
      path: "/stats",
      disabled: true,
    },
    { id: "profile", label: "Perfil", icon: "👤", path: "/profile" },
  ];

  const isAdminOrManager = activeTeam?.roles.some((r) =>
    ["team_admin", "manager"].includes(r),
  );

  const backofficeItems = isAdminOrManager
    ? [
        {
          id: "settings",
          label: "Configurações",
          icon: "⚙️",
          path: "/team-settings",
        },
        // Future: Add Roster
      ]
    : undefined;

  return (
    <div className="app-shell">
      <TopBar title={title} />
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
