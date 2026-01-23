import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="top-bar">
      {showBack && (
        <button onClick={() => navigate("/")} className="back-button">
          ←
        </button>
      )}
      <h1>{title}</h1>
      <div className="actions">
        {/* Placeholder for actions like Notifications or Menu */}
      </div>
    </header>
  );
}
