import { useRef } from "react";

export type HoldActionButtonProps = {
  label: string;
  durationMs: number;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
};

export function HoldActionButton({
  label,
  durationMs,
  onComplete,
  onProgress,
  className = "",
  disabled = false,
  title,
}: HoldActionButtonProps) {
  const startRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const pressedRef = useRef(false);

  const clearTimers = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const reset = () => {
    pressedRef.current = false;
    startRef.current = null;
    clearTimers();

    onProgress?.(0);
  };

  const tick = () => {
    if (!pressedRef.current || startRef.current === null) return;
    const elapsed = performance.now() - startRef.current;
    const nextProgress = Math.min(1, elapsed / durationMs);
    onProgress?.(nextProgress);
    if (elapsed < durationMs) {
      frameRef.current = window.requestAnimationFrame(tick);
    }
  };

  const handlePointerDown = () => {
    if (disabled) return;
    pressedRef.current = true;
    startRef.current = performance.now();

    onProgress?.(0);
    clearTimers();
    frameRef.current = window.requestAnimationFrame(tick);
    timeoutRef.current = window.setTimeout(() => {
      pressedRef.current = false;
      onProgress?.(1);
      onComplete();
      window.setTimeout(() => {
        onProgress?.(0);
      }, 250);
    }, durationMs);
  };

  const handlePointerUp = () => {
    if (!pressedRef.current) return;
    reset();
  };

  return (
    <button
      type="button"
      className={`relative overflow-hidden rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      disabled={disabled}
      title={title}
    >
      <span className="relative z-10">{label}</span>
    </button>
  );
}
