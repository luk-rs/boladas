import { WheelTimePicker } from "../../../components/ui/WheelTimePicker";
import { PLAYER_EMOJIS } from "../dashboard/constants";
import {
  GameFormProvider,
  Player,
  useGameFormContext,
} from "./game-form/context/GameFormContext";

export function GameFormPage() {
  return (
    <GameFormProvider>
      <GameFormPageView />
    </GameFormProvider>
  );
}

function GameFormPageView() {
  const {
    convocationId,
    sessionUserId,
    teamName,
    dateLabel,
    timeValue,
    setTimeValue,
    showTimePicker,
    setShowTimePicker,
    teamPlayers,
    setTeamPlayers,
    dragging,
    setDragging,
    dragOver,
    setDragOver,
    actionState,
    actionMessage,
    loading,
    error,
    statRows,
    addGuest,
    handleRejectGame,
    handleAcceptGame,
  } = useGameFormContext();

  const renderPlayerRow = (
    player: Player,
    index: number,
    variant: "name-emoji" | "emoji-name",
    team: "shirts" | "coletes",
  ) => {
    const emoji = PLAYER_EMOJIS[index % PLAYER_EMOJIS.length];
    const isSelf = player.id === sessionUserId;
    const isDragging = dragging?.team === team && dragging?.index === index;
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
        className={`flex items-center justify-between gap-2 px-3 py-2 transition-all cursor-grab active:cursor-grabbing hover:bg-white/10 dark:hover:bg-white/10 ${
          isDropTarget
            ? "bg-primary-500/10 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]"
            : ""
        } ${isDragging ? "opacity-50" : ""}`}
      >
        {variant === "name-emoji" ? (
          <>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {player.name}
            </span>
            <span
              className={`text-lg ${
                isSelf
                  ? "[filter:drop-shadow(0_0_4px_rgba(22,163,74,0.85))_drop-shadow(0_0_9px_rgba(22,163,74,0.55))] dark:[filter:drop-shadow(0_0_2px_rgba(74,222,128,0.95))_drop-shadow(0_0_6px_rgba(74,222,128,0.7))]"
                  : ""
              }`}
              aria-hidden
            >
              {emoji}
            </span>
          </>
        ) : (
          <>
            <span
              className={`text-lg ${
                isSelf
                  ? "[filter:drop-shadow(0_0_4px_rgba(22,163,74,0.85))_drop-shadow(0_0_9px_rgba(22,163,74,0.55))] dark:[filter:drop-shadow(0_0_2px_rgba(74,222,128,0.95))_drop-shadow(0_0_6px_rgba(74,222,128,0.7))]"
                  : ""
              }`}
              aria-hidden
            >
              {emoji}
            </span>
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
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-[var(--text-secondary)]">
            <span className="text-lg">👕</span>
            <span>vs</span>
            <span className="text-lg">🦺</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
            <div className="h-64 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-600">
          {error}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-[var(--text-secondary)]">
            <span className="text-lg">👕</span>
            <span>vs</span>
            <span className="text-lg">🦺</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <section className="flex h-full flex-col rounded-2xl bg-[var(--bg-surface)] p-4 shadow-mui">
              <div className="space-y-0">
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
              <div className="mt-auto pt-3">
                <button
                  type="button"
                  onClick={() => addGuest("shirts")}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-primary-500/60 hover:text-[var(--text-primary)] active:scale-[0.99]"
                >
                  <span>Adicionar convidado</span>
                  <span className="text-lg">＋</span>
                </button>
              </div>
            </section>

            <section className="flex h-full flex-col rounded-2xl bg-[var(--bg-surface)] p-4 shadow-mui">
              <div className="space-y-0">
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
              <div className="mt-auto pt-3">
                <button
                  type="button"
                  onClick={() => addGuest("coletes")}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-primary-500/60 hover:text-[var(--text-primary)] active:scale-[0.99]"
                >
                  <span>Adicionar convidado</span>
                  <span className="text-lg">＋</span>
                </button>
              </div>
            </section>
          </div>
          <div className="space-y-3 text-xs">
            <p className="text-[10px] uppercase tracking-[0.3em] text-center text-[var(--text-secondary)]">
              Stats
            </p>
            <div className="space-y-2">
              {statRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-center gap-3 text-sm"
                >
                  <p className="w-14 text-right font-semibold text-[var(--text-primary)]">
                    {row.left}
                    {row.suffix}
                  </p>
                  <span
                    className="text-lg"
                    title={row.label}
                    aria-label={row.label}
                  >
                    {row.icon}
                  </span>
                  <p className="w-14 text-left font-semibold text-[var(--text-primary)]">
                    {row.right}
                    {row.suffix}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex w-full items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleRejectGame()}
                disabled={actionState !== "idle" || !convocationId}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-200"
                title="Rejeitar convocatória"
              >
                💤
              </button>
              <button
                type="button"
                onClick={() => void handleAcceptGame()}
                disabled={actionState !== "idle" || !convocationId}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95 disabled:opacity-60"
                title="Aceitar jogo"
              >
                📝
              </button>
            </div>
            {actionMessage && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {actionMessage}
              </p>
            )}
          </div>
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
