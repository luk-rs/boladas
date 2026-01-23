import { useNavigate, useLocation, useParams } from "react-router-dom";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId } = useParams<{ teamId: string }>();

  if (!teamId) return null;

  const tabs = [
    { id: "games", label: "Jogos", icon: "📅" },
    { id: "standings", label: "Classificação", icon: "🏆" },
    { id: "stats", label: "Estatísticas", icon: "📊" },
    { id: "activity", label: "Atividade", icon: "🔔" },
    { id: "profile", label: "Perfil", icon: "👤" },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const path = `/t/${teamId}/${tab.id}`;
        const isActive = location.pathname.includes(path);

        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => navigate(path)}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
