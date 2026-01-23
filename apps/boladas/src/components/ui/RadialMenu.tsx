import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  disabled?: boolean;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  position?: "left" | "right";
}

export function RadialMenu({ items, position = "right" }: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div
      className={`fixed bottom-8 flex flex-col items-center z-50`}
      style={{ [position]: "2rem" }}
    >
      <div className="relative">
        {items.map((item, index) => {
          const angleRange = 100;
          const step = angleRange / (items.length - 1 || 1);
          const currentAngle =
            position === "right" ? 180 - step * index : 0 + step * index;

          const radian = (currentAngle * Math.PI) / 180;
          const radius = 110;
          const x = isOpen ? Math.cos(radian) * radius : 0;
          const y = isOpen ? -Math.sin(radian) * radius : 0;
          const isActive = location.pathname.includes(item.path);

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.disabled) return;
                navigate(item.path);
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={`absolute bottom-0 flex h-12 w-12 items-center justify-center rounded-full border-none shadow-mui transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
                item.disabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                  : "active:scale-95 cursor-pointer " +
                    (isActive
                      ? "bg-primary-500 text-white"
                      : "bg-[var(--bg-surface)] text-[var(--text-primary)]")
              }`}
              style={{
                [position]: 0,
                transform: `translate(${x}px, ${y}px)`,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? "auto" : "none",
                zIndex: 102,
              }}
              title={item.label + (item.disabled ? " (Bloqueado)" : "")}
            >
              <span className="text-xl">{item.icon}</span>
            </button>
          );
        })}

        {/* Trigger Button */}
        <button
          onClick={toggleMenu}
          className={`relative z-[101] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-2xl text-white shadow-lg transition-transform duration-300 active:scale-90 ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
        >
          +
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-white/20 dark:bg-black/20 backdrop-blur-sm"
        />
      )}
    </div>
  );
}
