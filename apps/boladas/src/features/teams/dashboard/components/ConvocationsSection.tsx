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
import { SurfaceTile } from "../../../../components/layout/SurfaceTile";

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

const INACTIVE_VOTE_ICON_CLASS =
  "opacity-85 [filter:grayscale(1)_saturate(0)_brightness(0.72)]";

const ACTIVE_VOTE_OUTLINE_GLOW_BY_STATE: Record<PlayerState, string> = {
  ball:
    "ring-1 ring-sky-300/70 shadow-[0_0_0_1px_rgba(56,189,248,0.78),0_0_10px_rgba(56,189,248,0.6),0_0_16px_rgba(56,189,248,0.42)]",
  couch:
    "ring-1 ring-amber-300/70 shadow-[0_0_0_1px_rgba(245,158,11,0.78),0_0_10px_rgba(245,158,11,0.58),0_0_16px_rgba(245,158,11,0.42)]",
  hospital:
    "ring-1 ring-rose-300/70 shadow-[0_0_0_1px_rgba(244,63,94,0.78),0_0_10px_rgba(244,63,94,0.58),0_0_16px_rgba(244,63,94,0.42)]",
};

export type ConvocationsSectionProps = {
  convocations: Convocation[];
  loading: boolean;
  canManageByTeamId: Map<string, boolean>;
  canCreateConvocation: boolean;
  canClickCreateConvocation: boolean;
  minTeamMembers: number;
  sessionUserId: string | null;
  activeTooltipId: string | null;
  onTooltipChange: (id: string | null) => void;
  onCreateConvocation: () => void;
  onVoteChange: (id: string, state: PlayerState) => void;
  onStatusChange: (id: string, status: ConvocationStatus) => void;
  holdProgressById: Record<string, HoldProgress>;
  onHoldProgress: (id: string, intent: HoldIntent, progress: number) => void;
};

export function ConvocationsSection({
  convocations,
  loading,
  canManageByTeamId,
  canCreateConvocation,
  canClickCreateConvocation,
  minTeamMembers,
  sessionUserId,
  activeTooltipId,
  onTooltipChange,
  onCreateConvocation,
  onVoteChange,
  onStatusChange,
  holdProgressById,
  onHoldProgress,
}: ConvocationsSectionProps) {
  const activeConvocations = convocations.filter(
    (convocation) => convocation.status === "open",
  );
  const inactiveConvocations = convocations.filter(
    (convocation) => convocation.status !== "open",
  );

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
      className={`flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-base transition-[transform,box-shadow] duration-150 active:scale-95 disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 ${
        isActive ? ACTIVE_VOTE_OUTLINE_GLOW_BY_STATE[state] : ""
      } ${isDimmed && !isActive ? "opacity-50" : ""}`}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      disabled={!isOpen || !sessionUserId}
      onClick={() => onVoteChange(convocationId, state)}
    >
      <span
        aria-hidden
        className={`transition-[filter,opacity] duration-150 ${
          isActive ? "opacity-100" : INACTIVE_VOTE_ICON_CLASS
        }`}
      >
        {icon}
      </span>
    </button>
  );

  const getRosterRowClass = (isOpen: boolean) =>
    `px-1 py-1 ${isOpen ? "" : "opacity-70"}`;
  const rowCountClass =
    "w-10 text-right text-xs font-semibold leading-none tabular-nums text-[var(--text-secondary)]";

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
    <div className={getRosterRowClass(isOpen)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {renderVoteIcon(
            convocationId,
            state,
            icon,
            label,
            isActive,
            isOpen,
            isDimmed,
          )}
          <span
            className={`${rowCountClass} ${
              isDimmed && !isActive ? "opacity-50" : ""
            }`}
          >
            {votes.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          {votes.length === 0 ? (
            <span
              className={`text-xs text-[var(--text-secondary)] ${
                isDimmed ? "opacity-40" : ""
              }`}
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
      </div>
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
      <div className={getRosterRowClass(isOpen)}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {renderVoteIcon(
              convocationId,
              "ball",
              "⚽️",
              "Bola",
              isActive,
              isOpen,
              isDimmed,
            )}
            <span
              className={`${rowCountClass} ${
                isDimmed && !isActive ? "opacity-50" : ""
              }`}
            >
              {sortedVotes.length}
            </span>
          </div>
          {sortedVotes.length === 0 ? (
            <span
              className={`text-xs text-[var(--text-secondary)] ${
                isDimmed ? "opacity-40" : ""
              }`}
            >
              Sem jogadores
            </span>
          ) : (
            <div className="min-w-0 flex flex-1 items-center">
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
      </div>
    );
  };

  const renderConvocationCard = (convocation: Convocation) => {
    const canManage = canManageByTeamId.get(convocation.teamId) ?? false;
    const isOpen = convocation.status === "open";
    const isInactive = convocation.status !== "open";
    const preserveDismissedManagerSurface =
      convocation.status === "dismissed" && canManage;
    const { dateLabel, timeLabel } = formatSchedule(convocation.scheduledAt);
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
    const rawCompletionPercentage =
      minTeamMembers > 0
        ? (convocation.roster.ball / minTeamMembers) * 100
        : 0;
    const completionPercentage = Math.max(rawCompletionPercentage, 0);
    const cappedCompletionPercentage = Math.min(completionPercentage, 100);
    const progressHue = Math.round((cappedCompletionPercentage / 100) * 120);
    const progressColor = isInactive
      ? "hsl(215 16% 58%)"
      : `hsl(${progressHue} 86% 50%)`;
    const progressBorderColor = isInactive
      ? "hsl(215 16% 58% / 0.7)"
      : `hsl(${progressHue} 86% 50% / 0.7)`;
    const progressGlowColor = isInactive
      ? "hsl(215 16% 58% / 0.35)"
      : `hsl(${progressHue} 92% 55% / 0.55)`;
    const hasOverfill = completionPercentage > 100;
    const completionLabel = `${Math.round(completionPercentage)}%`;
    const cardSurfaceClass = isOpen
      ? "border border-[var(--border-color)]"
      : preserveDismissedManagerSurface
        ? "border border-rose-300/45 bg-rose-50/80 dark:border-rose-700/40 dark:bg-rose-900/20"
        : "border border-slate-300/45 bg-slate-100/50 dark:border-slate-600/45 dark:bg-slate-800/25";
    const titleTextClass = isInactive
      ? "text-slate-500 dark:text-slate-300"
      : "text-[var(--text-primary)]";
    const metaTextClass = isInactive
      ? "text-slate-400 dark:text-slate-500"
      : "text-[var(--text-secondary)]";
    const iconToneClass = isInactive
      ? "[filter:grayscale(1)_saturate(0)_brightness(0.78)]"
      : "";
    const statusLabelClass = canReopen
      ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
      : STATUS_STYLES[convocation.status];
    const compactVoteSummary = [
      { id: "ball", icon: "⚽️", count: convocation.roster.ball },
      { id: "couch", icon: "🛋️", count: convocation.roster.couch },
      { id: "hospital", icon: "🏥", count: convocation.roster.hospital },
    ];

    return (
      <SurfaceTile
        key={convocation.id}
        variant="soft"
        className={`relative overflow-hidden px-4 py-3.5 ${cardSurfaceClass}`}
      >
        {holdState && (
          <div
            className={`pointer-events-none absolute inset-0 ${holdTint}`}
            style={{
              transform: `scaleX(${holdState.progress})`,
              transformOrigin: "left",
              transition:
                holdState.progress === 0 ? "none" : "transform 80ms linear",
            }}
          />
        )}
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-base font-semibold ${titleTextClass}`}>
                {displayTitle}
              </p>
              <div className={`flex items-center gap-3 text-xs ${metaTextClass}`}>
                <span className="inline-flex items-center gap-1">
                  <span className={iconToneClass}>📅</span> {dateLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className={iconToneClass}>🕘</span> {timeLabel}
                </span>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusLabelClass}`}
            >
              {STATUS_LABELS[convocation.status]}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="shrink-0 text-[10px] font-semibold leading-none tabular-nums"
              style={{ color: progressColor }}
            >
              {completionLabel}
            </span>
            <div
              className="relative h-2 flex-1 overflow-hidden rounded-full border bg-[var(--bg-app)]/70"
              style={{ borderColor: progressBorderColor }}
            >
              <div
                className="h-full rounded-full transition-[width,background,box-shadow] duration-300"
                style={{
                  width: `${cappedCompletionPercentage}%`,
                  background: progressColor,
                  boxShadow: `0 0 10px ${progressGlowColor}`,
                }}
              />
              {hasOverfill && (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 w-3 rounded-r-full"
                  style={{
                    boxShadow: `0 0 0 1px ${progressGlowColor}, 0 0 14px ${progressGlowColor}`,
                  }}
                />
              )}
            </div>
          </div>
          {isOpen ? (
            <div className="mt-1.5 space-y-1">
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
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              {compactVoteSummary.map((item) => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500"
                >
                  <span
                    className={`text-lg leading-none ${iconToneClass}`}
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isOpen && canManage && (
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onStatusChange(convocation.id, "dismissed")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-base text-rose-700 transition-all active:scale-95 dark:bg-rose-900/40 dark:text-rose-200"
                title="Dispensar"
              >
                💤
              </button>
              {canAccept ? (
                <button
                  type="button"
                  onClick={() => onStatusChange(convocation.id, "accepted")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-base text-white transition-all active:scale-95"
                  title="Aceitar"
                >
                  📝
                </button>
              ) : (
                <HoldActionButton
                  label="📝"
                  durationMs={3000}
                  onComplete={() => onStatusChange(convocation.id, "accepted")}
                  onProgress={(progress) =>
                    onHoldProgress(convocation.id, "accepted", progress)
                  }
                  className="h-8 w-8 rounded-full bg-emerald-500 text-base text-white"
                  title={`Segure 3s para aceitar com menos de ${minTeamMembers} jogadores`}
                />
              )}
            </div>
          )}

          {canManage && canReopen && (
            <div className="mt-2.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onStatusChange(convocation.id, "open")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-base text-[var(--text-primary)] transition-all active:scale-95"
                title="Reabrir"
              >
                🥅
              </button>
            </div>
          )}
        </div>
      </SurfaceTile>
    );
  };

  return (
    <section className="rounded-2xl p-5">
      <div className="space-y-4">
        {canCreateConvocation && (
          <>
            <button
              type="button"
              onClick={onCreateConvocation}
              disabled={!canClickCreateConvocation}
              className={`flex w-full items-center justify-between rounded-xl border border-dashed px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)] transition-all ${
                canClickCreateConvocation
                  ? "border-primary-500/60 bg-[var(--bg-app)] hover:border-primary-500 active:scale-[0.99]"
                  : "cursor-not-allowed border-[var(--border-color)] bg-[var(--bg-app)]/60 opacity-60"
              }`}
              title={
                canClickCreateConvocation
                  ? "Nova convocatória"
                  : `Precisas de pelo menos uma equipa completa (${minTeamMembers} jogadores).`
              }
              aria-label="Nova convocatória"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-base" aria-hidden>
                  ⚡
                </span>
                Nova convocatória
              </span>
              <span className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Criar
              </span>
            </button>
            {!canClickCreateConvocation && (
              <p className="text-xs text-[var(--text-secondary)]">
                Precisas de pelo menos uma equipa completa ({minTeamMembers}{" "}
                jogadores) para criar convocatória.
              </p>
            )}
          </>
        )}
        {loading ? (
          <>
            <SurfaceTile variant="dashed" className="h-44 p-0" />
            <SurfaceTile variant="dashed" className="h-44 p-0" />
          </>
        ) : convocations.length > 0 ? (
          <div className="space-y-5">
            {activeConvocations.length > 0 && (
              <div className="space-y-3">
                <p className="ui-section-title">Ativas</p>
                <div className="space-y-3">
                  {activeConvocations.map(renderConvocationCard)}
                </div>
              </div>
            )}
            {inactiveConvocations.length > 0 && (
              <div className="space-y-3">
                <p className="ui-section-title">Inativas</p>
                <div className="space-y-3">
                  {inactiveConvocations.map(renderConvocationCard)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <SurfaceTile
            variant="dashed"
            className="p-4 text-center text-sm text-[var(--text-secondary)]"
          >
            Nenhuma convocatória encontrada.
          </SurfaceTile>
        )}
      </div>
    </section>
  );
}
