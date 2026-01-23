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
    { id: "games", label: "Jogos", icon: "📅", path: "/games" },
    { id: "standings", label: "Classificação", icon: "🏆", path: "/standings" },
    { id: "stats", label: "Estatísticas", icon: "📊", path: "/stats" },
    { id: "activity", label: "Atividade", icon: "🔔", path: "/activity" },
    { id: "profile", label: "Perfil", icon: "👤", path: "/profile" },
  ];

  return (
    <div className="mobile-shell">
      <TopBar title={title} />
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet context={{ activeTeam }} />
      </main>
      <RadialMenu items={menuItems} position={menuPosition} />
    </div>
  );
}
