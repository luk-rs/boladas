import { useState, useEffect } from "react";

interface Game {
  id: string;
  date?: string;
  time?: string;
  opponent?: string;
  result?: string;
  isNext?: boolean;
}

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
      const response = await fetch(`${apiUrl}/games`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setGames(data);
    } catch (err: any) {
      console.error("Failed to fetch games:", err);
      setError(err.message || "Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="page-content flex flex-col items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Carregando jogos...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchGames}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white font-bold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-4">
        <h2>Jogos e Convocatórias</h2>
        <button
          onClick={fetchGames}
          className="text-xs text-primary-500 hover:underline"
        >
          Atualizar
        </button>
      </div>

      {games.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">
          Nenhum jogo agendado.
        </p>
      ) : (
        games.map((game) => (
          <div key={game.id} className="card" style={{ marginBottom: "1rem" }}>
            <p>
              {game.isNext ? "Próximo Jogo" : "Jogo Anterior"}:{" "}
              <strong>{game.date}</strong>
            </p>
            {game.time && (
              <p>
                {game.time} vs {game.opponent}
              </p>
            )}
            {game.result && <p>Result: {game.result}</p>}
          </div>
        ))
      )}
    </div>
  );
}
