import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  path?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  backofficeItems?: RadialMenuItem[];
  position?: "left" | "right";
}

export function RadialMenu({
  items,
  backofficeItems,
  position = "right",
}: RadialMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const triggerIconProps = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div
      className={`fixed bottom-8 flex flex-col items-center z-50`}
      style={{ [position]: "2rem" }}
    >
      <div className="relative">
        {/* Inner Ring */}
        {items.map((item, index) => {
          const angleRange = 100;
          const step = angleRange / (items.length - 1 || 1);
          const currentAngle =
            position === "right" ? 180 - step * index : 0 + step * index;

          const radian = (currentAngle * Math.PI) / 180;
          const radius = 110;
          const x = isOpen ? Math.cos(radian) * radius : 0;
          const y = isOpen ? -Math.sin(radian) * radius : 0;
          const isActive = item.path
            ? location.pathname.includes(item.path)
            : false;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.disabled) return;
                if (item.onClick) {
                  item.onClick();
                  setIsOpen(false);
                  return;
                }
                if (item.path) {
                  navigate(item.path);
                  setIsOpen(false);
                }
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
                transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
              }}
              title={item.label + (item.disabled ? " (Bloqueado)" : "")}
            >
              <span className="flex h-6 w-6 items-center justify-center">
                {item.icon}
              </span>
            </button>
          );
        })}

        {/* Outer Ring (Backoffice) */}
        {backofficeItems &&
          backofficeItems.map((item, index) => {
            const angleRange = 90; // Slightly narrower range for outer ring to keep it reachable
            const step = angleRange / (backofficeItems.length - 1 || 1);
            // Offset angle slightly so they don't overlap perfectly with inner ring lines if same count
            const offset = 5;
            const currentAngle =
              position === "right"
                ? 180 - step * index - offset
                : 0 + step * index + offset;

            const radian = (currentAngle * Math.PI) / 180;
            const radius = 180; // Larger radius
            const x = isOpen ? Math.cos(radian) * radius : 0;
            const y = isOpen ? -Math.sin(radian) * radius : 0;
            const isActive = item.path
              ? location.pathname.includes(item.path)
              : false;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.disabled) return;
                  if (item.onClick) {
                    item.onClick();
                    setIsOpen(false);
                    return;
                  }
                  if (item.path) {
                    navigate(item.path);
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`absolute bottom-0 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] shadow-xl transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
                  item.disabled
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                    : "active:scale-95 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 " +
                      (isActive
                        ? "bg-amber-500 text-white"
                        : "bg-[var(--bg-surface)] text-[var(--text-primary)]")
                }`}
                style={{
                  [position]: 0,
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: isOpen ? 1 : 0,
                  pointerEvents: isOpen ? "auto" : "none",
                  zIndex: 101, // Behind inner ring slightly
                  transitionDelay: isOpen ? `${index * 50 + 100}ms` : "0ms", // Staggered after inner ring
                }}
                title={item.label}
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </span>
              </button>
            );
          })}

        {/* Trigger Button */}
        <button
          onClick={toggleMenu}
          className={`relative z-[101] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-white/30 dark:border-white/10 text-2xl shadow-xl transition-all duration-300 active:scale-95 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" aria-hidden {...triggerIconProps}>
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden {...triggerIconProps}>
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="12" cy="5" r="0.8" />
              <circle cx="12" cy="19" r="0.8" />
              <circle cx="5" cy="12" r="0.8" />
              <circle cx="19" cy="12" r="0.8" />
              <circle cx="16.95" cy="7.05" r="0.7" />
              <circle cx="7.05" cy="16.95" r="0.7" />
              <circle cx="7.05" cy="7.05" r="0.7" />
              <circle cx="16.95" cy="16.95" r="0.7" />
              <circle cx="12" cy="8.2" r="0.55" />
              <circle cx="12" cy="15.8" r="0.55" />
              <circle cx="8.2" cy="12" r="0.55" />
              <circle cx="15.8" cy="12" r="0.55" />
            </svg>
          )}
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
