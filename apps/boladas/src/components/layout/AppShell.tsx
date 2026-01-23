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

  useEffect(() => {
    // Load initial position
    const saved = localStorage.getItem("menu-position") as "left" | "right";
    if (saved) setMenuPosition(saved);

    // Listen for changes
    const handleChange = () => {
      const saved = localStorage.getItem("menu-position") as "left" | "right";
      if (saved) setMenuPosition(saved);
    };

    window.addEventListener("menu-position-change", handleChange);
    return () => {
      window.removeEventListener("menu-position-change", handleChange);
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
    <div className="team-shell">
      <TopBar title={title} />
      <main className="content">
        <Outlet context={{ activeTeam }} />
      </main>
      <RadialMenu items={menuItems} position={menuPosition} />

      <style>{`
        .team-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #f5f5f5;
        }
        /* TopBar styles are likely global or handled within TopBar, but keeping layout specific here if needed */
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          padding-bottom: 80px; /* Space for content to not be hidden behind menu if needed */
        }
      `}</style>
    </div>
  );
}
