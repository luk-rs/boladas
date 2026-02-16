import { HTMLAttributes } from "react";

export type SurfaceTileVariant = "soft" | "strong" | "dashed" | "danger";

export type SurfaceTileProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceTileVariant;
};

const VARIANT_CLASS: Record<SurfaceTileVariant, string> = {
  soft: "bg-[var(--bg-app)]/70",
  strong: "border border-[var(--border-color)] bg-[var(--bg-surface)]",
  dashed:
    "border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]/60",
  danger:
    "border border-rose-300/60 bg-rose-50/70 dark:border-rose-700/40 dark:bg-rose-900/10",
};

export function SurfaceTile({
  variant = "soft",
  className = "",
  children,
  ...props
}: SurfaceTileProps) {
  return (
    <div
      className={`rounded-xl p-4 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
