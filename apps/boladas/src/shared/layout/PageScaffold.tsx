import { ReactNode } from "react";

export type PageScaffoldProps = {
  title?: string;
  align?: "left" | "center";
  children: ReactNode;
  className?: string;
};

export function PageScaffold({
  title,
  align = "left",
  children,
  className = "",
}: PageScaffoldProps) {
  const isCentered = align === "center";

  return (
    <div
      className={`space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 ${className}`}
    >
      {title && (
        <header
          className={`rounded-2xl p-5 sm:p-6 ${isCentered ? "text-center" : "text-left"}`}
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {title}
          </h2>
        </header>
      )}
      {children}
    </div>
  );
}
