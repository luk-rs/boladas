import { ReactNode } from "react";
import { SurfaceTile, type SurfaceTileVariant } from "./SurfaceTile";

export type SectionShellProps = {
  title: string;
  variant?: Extract<SurfaceTileVariant, "soft" | "strong">;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SectionShell({
  title,
  variant = "soft",
  children,
  className = "",
  bodyClassName = "mt-3",
}: SectionShellProps) {
  return (
    <SurfaceTile variant={variant} className={`rounded-2xl p-4 ${className}`}>
      <p className="ui-section-title">{title}</p>
      <div className={bodyClassName}>{children}</div>
    </SurfaceTile>
  );
}
