import { formatSchedule } from "../utils";
import {
  Convocation,
  ConvocationStatus,
  HoldIntent,
  HoldProgress,
  PlayerState,
  VoteEntry,
} from "../types";
import { EmojiStack } from "./EmojiStack";
import { HoldActionButton } from "./HoldActionButton";

const STATUS_LABELS: Record<ConvocationStatus, string> = {
  open: "Aberta",
  accepted: "Aceite",
  dismissed: "Dispensada",
};

const STATUS_STYLES: Record<ConvocationStatus, string> = {
  open: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  accepted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  dismissed:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export type ConvocationsSectionProps = {
  convocations: Convocation[];
  loading: boolean;
  canManageByTeamId: Map<string, boolean>;
  minTeamMembers: number;
  sessionUserId: string | null;
  activeTooltipId: string | null;
  onTooltipChange: (id: string | null) => void;
  onVoteChange: (id: string, state: PlayerState) => void;
  onStatusChange: (id: string, status: ConvocationStatus) => void;
  holdProgressById: Record<string, HoldProgress>;
  onHoldProgress: (id: string, intent: HoldIntent, progress: number) => void;
};

export function ConvocationsSection({
  convocations,
  loading,
  canManageByTeamId,
  minTeamMembers,
  sessionUserId,
  activeTooltipId,
  onTooltipChange,
  onVoteChange,
  onStatusChange,
  holdProgressById,
  onHoldProgress,
}: ConvocationsSectionProps) {
  const renderVoteIcon = (
    convocationId: string,
    state: PlayerState,
    icon: string,
    label: string,
    isActive: boolean,
    isOpen: boolean,
    isDimmed: boolean,
  ) => (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all active:scale-95 ${
        isActive
          ? "bg-primary-600 text-white shadow-sm"
          : "bg-transparent text-[var(--text-secondary)]"
      } ${isDimmed && !isActive ? "opacity-50" : ""}`}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      disabled={!isOpen || !sessionUserId}
      onClick={() => onVoteChange(convocationId, state)}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );

  const renderRoster = (
    convocationId: string,
    state: PlayerState,
    votes: VoteEntry[],
    keyPrefix: string,
    isDimmed: boolean,
    icon: string,
    label: string,
    isOpen: boolean,
    isActive: boolean,
  ) => (
    <div className="flex items-center gap-3">
      {renderVoteIcon(
        convocationId,
        state,
        icon,
        label,
        isActive,
        isOpen,
        isDimmed,
      )}
      {votes.length === 0 ? (
        <span
          className={`text-xs text-[var(--text-secondary)] ${
            isDimmed ? "opacity-40" : ""
          } pl-1`}
        >
          Sem jogadores
        </span>
      ) : (
        <EmojiStack
          items={votes.map((vote) => ({
            id: `${keyPrefix}-${vote.userId}`,
            label: vote.label,
            isSelf: vote.userId === sessionUserId,
          }))}
          showTooltip
          activeTooltipId={activeTooltipId}
          onTooltipChange={onTooltipChange}
          dimmed={isDimmed}
        />
      )}
    </div>
  );

  const renderBallRoster = (
    convocationId: string,
    votes: VoteEntry[],
    keyPrefix: string,
    isDimmed: boolean,
    isOpen: boolean,
    isActive: boolean,
  ) => {
    const sortedVotes = [...votes].sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
    const starters = sortedVotes.slice(0, minTeamMembers);
    const substitutes = sortedVotes.slice(minTeamMembers);
    const starterWidth = `calc(${minTeamMembers} * 1.75rem - ${
      minTeamMembers - 1
    } * 1rem)`;

    return (
      <div className="flex items-center gap-3">
        {renderVoteIcon(
          convocationId,
          "ball",
          "⚽️",
          "Bola",
          isActive,
          isOpen,
          isDimmed,
        )}
        {sortedVotes.length === 0 ? (
          <span
            className={`text-xs text-[var(--text-secondary)] ${
              isDimmed ? "opacity-40" : ""
            } pl-1`}
          >
            Sem jogadores
          </span>
        ) : (
          <div className="flex items-center">
            <div className="flex items-center" style={{ width: starterWidth }}>
              <EmojiStack
                items={starters.map((vote) => ({
                  id: `${keyPrefix}-t-${vote.userId}`,
                  label: vote.label,
                  isSelf: vote.userId === sessionUserId,
                }))}
                showTooltip
                activeTooltipId={activeTooltipId}
                onTooltipChange={onTooltipChange}
                dimmed={isDimmed}
              />
            </div>
            <div
              className={`mx-2 h-6 w-px bg-slate-300/70 shadow-[0_0_6px_rgba(148,163,184,0.6)] dark:bg-white/40 dark:shadow-[0_0_6px_rgba(255,255,255,0.35)] ${
                isDimmed ? "opacity-40" : ""
              }`}
            />
            <div className="flex items-center">
              {substitutes.length > 0 && (
                <EmojiStack
                  items={substitutes.map((vote) => ({
                    id: `${keyPrefix}-s-${vote.userId}`,
                    label: vote.label,
                    isSelf: vote.userId === sessionUserId,
                  }))}
                  showTooltip
                  activeTooltipId={activeTooltipId}
                  onTooltipChange={onTooltipChange}
                  dimmed={isDimmed}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Convocatórias
          </p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Convocatórias em aberto para mim
          </h2>
        </div>
        <span className="text-2xl">📣</span>
      </header>
      <div className="mt-4 space-y-4">
        {loading ? (
          <>
            <div className="h-44 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
            <div className="h-44 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60" />
          </>
        ) : convocations.length > 0 ? (
          convocations.map((convocation) => {
            const canManage =
              canManageByTeamId.get(convocation.teamId) ?? false;
            const isOpen = convocation.status === "open";
            const { dateLabel, timeLabel } = formatSchedule(
              convocation.scheduledAt,
            );
            const canReopen =
              convocation.status === "dismissed" &&
              new Date(convocation.scheduledAt).getTime() > Date.now();
            const canAccept = convocation.roster.ball >= minTeamMembers;
            const holdState = holdProgressById[convocation.id];
            const holdTint =
              holdState?.intent === "accepted"
                ? "bg-emerald-50/80 dark:bg-emerald-900/20"
                : "";
            const displayTitle = convocation.teamName;

            return (
              <div
                key={convocation.id}
                className={`relative overflow-hidden rounded-xl px-4 py-4 ${
                  convocation.status === "dismissed"
                    ? "bg-rose-50/80 dark:bg-rose-900/20"
                    : convocation.status === "accepted"
                      ? "bg-emerald-50/80 dark:bg-emerald-900/20"
                      : "bg-[var(--bg-app)]"
                }`}
              >
                {holdState && (
                  <div
                    className={`pointer-events-none absolute inset-0 ${holdTint}`}
                    style={{
                      transform: `scaleX(${holdState.progress})`,
                      transformOrigin: "left",
                      transition:
                        holdState.progress === 0
                          ? "none"
                          : "transform 80ms linear",
                    }}
                  />
                )}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {displayTitle}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          📅 {dateLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          🕘 {timeLabel}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        STATUS_STYLES[convocation.status]
                      }`}
                    >
                      {STATUS_LABELS[convocation.status]}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {renderBallRoster(
                      convocation.id,
                      convocation.ballVotes,
                      `${convocation.id}-b`,
                      convocation.myState !== "ball",
                      isOpen,
                      convocation.myState === "ball",
                    )}
                    {renderRoster(
                      convocation.id,
                      "couch",
                      convocation.couchVotes,
                      `${convocation.id}-c`,
                      convocation.myState !== "couch",
                      "🛋️",
                      "Sofá",
                      isOpen,
                      convocation.myState === "couch",
                    )}
                    {renderRoster(
                      convocation.id,
                      "hospital",
                      convocation.hospitalVotes,
                      `${convocation.id}-h`,
                      convocation.myState !== "hospital",
                      "🏥",
                      "Hospital",
                      isOpen,
                      convocation.myState === "hospital",
                    )}
                  </div>

                  {isOpen && canManage && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onStatusChange(convocation.id, "dismissed")}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                        title="Dispensar"
                      >
                        💤
                      </button>
                      {canAccept ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange(convocation.id, "accepted")}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95"
                          title="Aceitar"
                        >
                          📝
                        </button>
                      ) : (
                        <HoldActionButton
                          label="📝"
                          durationMs={3000}
                          onComplete={() =>
                            onStatusChange(convocation.id, "accepted")
                          }
                          onProgress={(progress) =>
                            onHoldProgress(convocation.id, "accepted", progress)
                          }
                          className="h-9 w-9 rounded-full bg-emerald-500 text-base text-white"
                          title={`Segure 3s para aceitar com menos de ${minTeamMembers} jogadores`}
                        />
                      )}
                    </div>
                  )}

                  {canManage && canReopen && (
                    <div className="mt-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onStatusChange(convocation.id, "open")}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-base text-[var(--text-primary)] transition-all active:scale-95"
                        title="Reabrir"
                      >
                        🥅
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)] p-4 text-center text-sm text-[var(--text-secondary)]">
            Nenhuma convocatória encontrada.
          </div>
        )}
      </div>
    </section>
  );
}
