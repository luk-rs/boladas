export function ActivityPage() {
  return (
    <div className="page-content">
      <h2>Atividade</h2>
      <div className="card">
        <p>
          <strong>Novo jogo agendado</strong>
        </p>
        <p className="muted">15 horas ago</p>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p>
          <strong>Convocatória publicada</strong>
        </p>
        <p className="muted">2 days ago</p>
      </div>
    </div>
  );
}
