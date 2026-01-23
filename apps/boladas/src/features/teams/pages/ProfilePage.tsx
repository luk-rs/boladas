import { useAuth } from "../../auth/useAuth";

export function ProfilePage() {
  const { signOut } = useAuth();

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
