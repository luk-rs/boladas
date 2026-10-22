import { Link } from "react-router-dom";
import { WheelTimePicker } from "../../../shared/ui/WheelTimePicker";
import { BottomSheet } from "../../../shared/ui/BottomSheet";
import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import { PLAYER_EMOJIS } from "../../team-scope/constants";
import {
  GameFormProvider,
  Player,
  useGameFormContext,
} from "../context/GameFormContext";

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
    gameExists,
    handleReopenConvocation,
    statRows,
    addGuest,
    shuffleTeams,
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
        draggable={!gameExists}
        onDragStart={(event) => {
          if (gameExists) return;
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
    <PageScaffold className="space-y-6">
      <SurfaceTile variant="soft" className="flex flex-wrap items-center gap-3">
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
      </SurfaceTile>

      {gameExists && (
        <SurfaceTile
          variant="soft"
          className="border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 text-center text-xs text-amber-800 dark:text-amber-200"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <span>🔒</span>
              <span>Jogo já agendado para esta convocatória</span>
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 max-w-md">
              O sorteio e as equipas estão bloqueados. Para reorganizar ou sortear novamente, é necessário reabrir a convocatória (o jogo agendado será removido).
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/games"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-primary-500 transition-all active:scale-95"
              >
                <span>⚽</span>
                <span>Ver Jogo Agendado</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Reabrir esta convocatória irá apagar o jogo agendado associado para que possas voltar a sortear as equipas. Desejas continuar?",
                  );
                  if (confirmed) {
                    void handleReopenConvocation();
                  }
                }}
                disabled={actionState !== "idle"}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 active:scale-95 disabled:opacity-50"
              >
                <span>↺</span>
                <span>Reabrir Convocatória</span>
              </button>
            </div>
          </div>
        </SurfaceTile>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-sm font-semibold text-[var(--text-secondary)]">
            <span className="text-lg">👕</span>
            <span>vs</span>
            <span className="text-lg">🦺</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SurfaceTile variant="dashed" className="h-64 p-0" />
            <SurfaceTile variant="dashed" className="h-64 p-0" />
          </div>
        </div>
      ) : error ? (
        <SurfaceTile
          variant="danger"
          className="border-dashed p-4 text-center text-sm text-rose-600"
        >
          {error}
        </SurfaceTile>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <span>👕 Camisolas ({teamPlayers.shirts.length})</span>
              <span>vs</span>
              <span>🦺 Coletes ({teamPlayers.coletes.length})</span>
            </div>
            {!gameExists && (
              <button
                type="button"
                onClick={shuffleTeams}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all hover:border-primary-500 hover:text-primary-600 active:scale-95 dark:hover:text-primary-400"
                title="Baralhar e sortear jogadores entre as duas equipas"
              >
                <span aria-hidden>🎲</span>
                <span>Sortear</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SurfaceTile variant="soft" className="flex h-full flex-col">
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
              {!gameExists && (
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
              )}
            </SurfaceTile>

            <SurfaceTile variant="soft" className="flex h-full flex-col">
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
              {!gameExists && (
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
              )}
            </SurfaceTile>
          </div>
          <div className="space-y-3 text-xs">
            <p className="text-[10px] uppercase tracking-[0.3em] text-center text-[var(--text-secondary)]">
              Estatísticas
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
              {!gameExists ? (
                <>
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
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Reabrir esta convocatória irá apagar o jogo agendado associado para que possas voltar a sortear as equipas. Desejas continuar?",
                    );
                    if (confirmed) {
                      void handleReopenConvocation();
                    }
                  }}
                  disabled={actionState !== "idle"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 shadow-sm transition-all hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 disabled:opacity-50"
                  title="Reabrir convocatória (remove o jogo agendado)"
                >
                  <span aria-hidden>↺</span>
                  <span>Reabrir Convocatória</span>
                </button>
              )}
            </div>
            {actionMessage && (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                {actionMessage}
              </p>
            )}
          </div>
        </div>
      )}

      <BottomSheet
        open={showTimePicker}
        title="Ajustar hora"
        onClose={() => setShowTimePicker(false)}
        onConfirm={() => setShowTimePicker(false)}
      >
        <WheelTimePicker value={timeValue} onChange={setTimeValue} />
      </BottomSheet>
    </PageScaffold>
  );
}
