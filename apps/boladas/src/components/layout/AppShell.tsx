import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { RadialMenu } from "../ui/RadialMenu";
import { useTeams } from "../../features/teams/useTeams";
import { useAuth } from "../../features/auth/useAuth";

export function AppShell() {
  const { sessionUserId, isSystemAdmin, signOut } = useAuth();
  const { memberships } = useTeams(sessionUserId, isSystemAdmin);
  const activeTeam = memberships[0];

  const [menuPosition, setMenuPosition] = useState<"left" | "right">("right");
  const [, setTheme] = useState<"light" | "dark">("light");

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

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet context={{ activeTeam }} />
      </main>
      <RadialMenu items={menuItems} position={menuPosition} />
    </div>
  );
}
