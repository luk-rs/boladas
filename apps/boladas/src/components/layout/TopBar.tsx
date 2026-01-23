import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 bg-[var(--bg-surface)] p-4 shadow-md transition-colors duration-200">
      <div className="flex-1 overflow-hidden">
        <h1 className="truncate text-lg font-bold text-[var(--text-primary)]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Placeholder for future top-bar actions like notifications or team switch button */}
      </div>
    </header>
  );
}
