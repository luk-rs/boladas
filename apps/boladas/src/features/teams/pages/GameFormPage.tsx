import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { WheelTimePicker } from "../../../components/ui/WheelTimePicker";
import { PLAYER_EMOJIS } from "../dashboard/constants";

type Player = {
  id: string;
  name: string;
};

type TeamsResponse = {
  convocationId: string;
  teamName: string;
  scheduledAt: string;
  teams: {
    shirts: Player[];
    coletes: Player[];
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "--/--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return "19:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "19:00";
  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export function GameFormPage() {
  const { convocationId } = useParams();
  const [teamName, setTeamName] = useState("Equipa");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [timeValue, setTimeValue] = useState("19:00");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<{
    shirts: Player[];
    coletes: Player[];
  }>({ shirts: [], coletes: [] });
  const [guestCountShirts, setGuestCountShirts] = useState(0);
  const [guestCountColetes, setGuestCountColetes] = useState(0);
  const [dragging, setDragging] = useState<{
    team: "shirts" | "coletes";
    index: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState<{
    team: "shirts" | "coletes";
    index: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = useMemo(() => formatDate(scheduledAt), [scheduledAt]);

  useEffect(() => {
    if (!convocationId) {
      setError("Convocatória não encontrada.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
        const response = await fetch(
          `${apiUrl.replace(/\/$/, "")}/convocations/${convocationId}/teams`,
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = (await response.json()) as TeamsResponse;
        if (!isMounted) return;

        setTeamName(data.teamName ?? "Equipa");
        setScheduledAt(data.scheduledAt ?? null);
        setTimeValue(formatTime(data.scheduledAt));
        setTeamPlayers({
          shirts: data.teams?.shirts ?? [],
          coletes: data.teams?.coletes ?? [],
        });
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Falha ao carregar equipes.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchTeams();
    return () => {
      isMounted = false;
    };
  }, [convocationId]);

  const addGuest = (team: "shirts" | "coletes") => {
    const guestIndex =
      team === "shirts" ? guestCountShirts + 1 : guestCountColetes + 1;
    const newGuest = {
      id: `guest-${team}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      name: `Convidado ${guestIndex}`,
    };
    setTeamPlayers((prev) => ({
      ...prev,
      [team]: [...prev[team], newGuest],
    }));
    if (team === "shirts") {
      setGuestCountShirts(guestIndex);
    } else {
      setGuestCountColetes(guestIndex);
    }
  };

  const renderPlayerRow = (
    player: Player,
    index: number,
    variant: "name-emoji" | "emoji-name",
    team: "shirts" | "coletes",
  ) => {
    const emoji = PLAYER_EMOJIS[index % PLAYER_EMOJIS.length];
    const isDragging =
      dragging?.team === team && dragging?.index === index;
    const isDropTarget =
      dragOver?.team === team &&
      dragOver?.index === index &&
      dragging &&
      dragging.team !== team;
    return (
      <div
        key={player.id}
        draggable
        onDragStart={(event) => {
          setDragging({ team, index });
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            "application/json",
            JSON.stringify({ team, index }),
          );
        }}
        onDragEnd={() => {
          setDragging(null);
          setDragOver(null);
        }}
        onDragOver={(event) => {
          if (!dragging || dragging.team === team) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDragOver({ team, index });
        }}
        onDragLeave={() => {
          if (dragOver?.team === team && dragOver.index === index) {
            setDragOver(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          const payload = event.dataTransfer.getData("application/json");
          if (!payload) return;
          const parsed = JSON.parse(payload) as {
            team: "shirts" | "coletes";
            index: number;
          };
          if (parsed.team === team) return;
          setTeamPlayers((prev) => {
            const sourceList = [...prev[parsed.team]];
            const targetList = [...prev[team]];
            const sourcePlayer = sourceList[parsed.index];
            const targetPlayer = targetList[index];
            if (!sourcePlayer || !targetPlayer) return prev;
            sourceList[parsed.index] = targetPlayer;
            targetList[index] = sourcePlayer;
            return {
              ...prev,
              [parsed.team]: sourceList,
              [team]: targetList,
            };
          });
          setDragging(null);
          setDragOver(null);
        }}
        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all cursor-grab active:cursor-grabbing ${
          isDropTarget
            ? "border-primary-400 bg-primary-500/10 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]"
            : "border-[var(--border-color)] bg-[var(--bg-app)]"
        } ${isDragging ? "opacity-50" : ""}`}
      >
        {variant === "name-emoji" ? (
          <>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {player.name}
            </span>
            <span className="text-lg">{emoji}</span>
          </>
        ) : (
          <>
            <span className="text-lg">{emoji}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {player.name}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="page-content space-y-6">
      <header className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg-surface)] p-4 shadow-mui">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {teamName}
        </h2>
        <span className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]">
          <span className="text-base">📅</span>
          {dateLabel}
        </span>
        <button
          type="button"
          onClick={() => setShowTimePicker(true)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)] transition-all active:scale-95"
          title="Ajustar hora"
        >
          <span className="text-base">🕘</span>
          {timeValue}
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
          <div className="h-64 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <section className="rounded-2xl bg-[var(--bg-surface)] p-4 shadow-mui">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Shirts
              </h3>
              <span className="text-lg">👕</span>
            </header>
            <div className="space-y-2">
              {teamPlayers.shirts.length ? (
                teamPlayers.shirts.map((player, index) =>
                  renderPlayerRow(player, index, "name-emoji", "shirts"),
                )
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-3 text-center text-xs text-[var(--text-secondary)]">
                  Sem jogadores.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => addGuest("shirts")}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-primary-500/60 hover:text-[var(--text-primary)] active:scale-[0.99]"
            >
              <span>Adicionar convidado</span>
              <span className="text-lg">＋</span>
            </button>
          </section>

          <section className="rounded-2xl bg-[var(--bg-surface)] p-4 shadow-mui">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Coletes
              </h3>
              <span className="text-lg">🦺</span>
            </header>
            <div className="space-y-2">
              {teamPlayers.coletes.length ? (
                teamPlayers.coletes.map((player, index) =>
                  renderPlayerRow(player, index, "emoji-name", "coletes"),
                )
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-3 text-center text-xs text-[var(--text-secondary)]">
                  Sem jogadores.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => addGuest("coletes")}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-primary-500/60 hover:text-[var(--text-primary)] active:scale-[0.99]"
            >
              <span>Adicionar convidado</span>
              <span className="text-lg">＋</span>
            </button>
          </section>
        </div>
      )}

      {showTimePicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                Ajustar Hora
              </h3>
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>
            <WheelTimePicker value={timeValue} onChange={setTimeValue} />
          </div>
        </div>
      )}
    </div>
  );
}
