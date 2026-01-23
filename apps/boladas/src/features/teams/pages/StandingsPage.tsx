export function StandingsPage() {
  return (
    <div className="page-content">
      <h2>Tabela Classificativa</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>Pos</th>
            <th>Team</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Equipa 1</td>
            <td>23</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Equipa 2</td>
            <td>21</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Equipa 3</td>
            <td>18</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
