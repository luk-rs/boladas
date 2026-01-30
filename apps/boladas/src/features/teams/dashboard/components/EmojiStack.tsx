import { PLAYER_EMOJIS } from "../constants";
import { EmojiStackItem } from "../types";

export type EmojiStackProps = {
  items: EmojiStackItem[];
  showTooltip?: boolean;
  activeTooltipId?: string | null;
  onTooltipChange?: (id: string | null) => void;
  className?: string;
  dimmed?: boolean;
};

export function EmojiStack({
  items,
  showTooltip = false,
  activeTooltipId,
  onTooltipChange,
  className = "",
  dimmed = false,
}: EmojiStackProps) {
  return (
    <div
      className={`flex flex-wrap -space-x-4 text-base ${
        dimmed ? "opacity-40" : ""
      } ${className}`}
    >
      {items.map((item, index) => {
        const emoji = PLAYER_EMOJIS[index % PLAYER_EMOJIS.length];
        const isTooltipEnabled = showTooltip && Boolean(item.label);
        const isActive =
          isTooltipEnabled && activeTooltipId === item.id && item.label;
        const emojiNode = (
          <span
            className={
              item.isSelf
                ? "[filter:drop-shadow(0_0_4px_rgba(22,163,74,0.85))_drop-shadow(0_0_9px_rgba(22,163,74,0.55))] dark:[filter:drop-shadow(0_0_2px_rgba(74,222,128,0.95))_drop-shadow(0_0_6px_rgba(74,222,128,0.7))]"
                : ""
            }
            aria-hidden
          >
            {emoji}
          </span>
        );

        if (isTooltipEnabled) {
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              className="group relative flex h-7 w-7 items-center justify-center text-left"
              style={{ zIndex: items.length - index }}
              onClick={() => onTooltipChange?.(isActive ? null : item.id)}
              onBlur={() => onTooltipChange?.(null)}
              onMouseLeave={() => onTooltipChange?.(null)}
            >
              {emojiNode}
              <span
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ opacity: isActive ? 1 : undefined }}
              >
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <span
            key={item.id}
            className="relative flex h-7 w-7 items-center justify-center"
            style={{ zIndex: items.length - index }}
            aria-hidden
          >
            {emojiNode}
          </span>
        );
      })}
    </div>
  );
}
