export function GamesPage() {
  return (
    <div className="page-content">
      <h2>Jogos e Convocatórias</h2>
      <div className="card">
        <p>
          Próximo Jogo: <strong>18 Dez 2022</strong>
        </p>
        <p>13:00 vs Team B</p>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p>
          Jogo Anterior: <strong>14 Dez 2022</strong>
        </p>
        <p>Result: 2-1</p>
      </div>
    </div>
  );
}
