import { useState, useEffect } from "react";
import { useAuth } from "../../auth/useAuth";

export function ProfilePage() {
  const { signOut } = useAuth();
  const [menuPosition, setMenuPosition] = useState<"left" | "right">("right");

  useEffect(() => {
    const saved = localStorage.getItem("menu-position") as "left" | "right";
    if (saved) setMenuPosition(saved);
  }, []);

  const togglePosition = (pos: "left" | "right") => {
    setMenuPosition(pos);
    localStorage.setItem("menu-position", pos);
    window.dispatchEvent(new Event("menu-position-change"));
  };

  return (
    <div className="page-content">
      <h2>Perfil</h2>
      <div style={{ textAlign: "center", margin: "2rem 0" }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#ccc",
            margin: "0 auto",
          }}
        ></div>
        <h3>Avatar Name</h3>
        <p>Position</p>
      </div>
      <div
        className="row"
        style={{ justifyContent: "space-around", textAlign: "center" }}
      >
        <div>
          <strong>66</strong>
          <br />
          Pots
        </div>
        <div>
          <strong>23</strong>
          <br />
          Jogos
        </div>
        <div>
          <strong>54</strong>
          <br />
          Assists
        </div>
      </div>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <h4>Menu Position</h4>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={() => togglePosition("left")}
            style={{
              padding: "0.5rem 1rem",
              background: menuPosition === "left" ? "#007bff" : "#eee",
              color: menuPosition === "left" ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Left
          </button>
          <button
            onClick={() => togglePosition("right")}
            style={{
              padding: "0.5rem 1rem",
              background: menuPosition === "right" ? "#007bff" : "#eee",
              color: menuPosition === "right" ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Right
          </button>
        </div>
      </div>

      <div style={{ marginTop: "3rem", textAlign: "center" }}>
        <button
          className="provider-button"
          onClick={signOut}
          style={{ background: "#ff4444", color: "white", width: "100%" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
