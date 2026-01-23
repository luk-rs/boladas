import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
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

  // Position styles
  const baseStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "2rem",
    [position]: "2rem", // 'left': 2rem or 'right': 2rem
    zIndex: 100,
  };

  return (
    <div style={baseStyle}>
      {/* Menu Items */}
      <div style={{ position: "relative" }}>
        {items.map((item, index) => {
          // Calculate position for expanded state
          // Simple vertical stack or arc? User said "Radial Menu... radial menu on the bottom right corner"
          // Let's implement a simple arc.
          // 90 degrees fan.
          // If right: angles from 180 (left) to 90 (up).
          // If left: angles from 0 (right) to 90 (up).

          const angleRange = 90;
          const startAngle = position === "right" ? 180 : 270; // 0 is right, 90 up, 180 left, 270 down? Math: 0 is Right.
          // position right (bottom-right corner) -> items go Left and Up. So 90deg to 180deg.
          // position left (bottom-left corner) -> items go Right and Up. So 0deg to 90deg.

          const step = angleRange / (items.length - 1 || 1);
          const currentAngle =
            position === "right"
              ? 180 - step * index // 180, ..., 90
              : 0 + step * index; // 0, ..., 90

          const radian = (currentAngle * Math.PI) / 180;
          const radius = 120; // Distance from center

          const x = isOpen ? Math.cos(radian) * radius : 0;
          // Y is typically negative for "Up" in CSS translate? No, positive Y is down. So -y.
          const y = isOpen ? -Math.sin(radian) * radius : 0;

          const isActive = location.pathname.includes(item.path);

          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              style={{
                position: "absolute",
                zIndex: 102,
                bottom: 0,
                [position === "right" ? "right" : "left"]: 0,
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                background: isActive ? "#007bff" : "#fff",
                color: isActive ? "#fff" : "#333",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                transform: `translate(${position === "right" ? x : x}px, ${y}px)`, // x is relative to origin.
                // wait, if right:0, positive X moves right (off screen).
                // Math: 180deg is Left. cos(180) = -1. So x is negative. Correct.
                // 0deg is Right. cos(0) = 1. So x is positive. Correct.
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? "auto" : "none",
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}

        {/* Trigger Button */}
        <button
          onClick={toggleMenu}
          style={{
            position: "relative",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "none",
            background: "#222",
            color: "#fff",
            fontSize: "1.5rem",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 101,
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </button>
      </div>

      {/* Backdrop to close */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}
    </div>
  );
}
