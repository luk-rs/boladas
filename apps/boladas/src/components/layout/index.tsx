import { ReactNode } from "react";

export function Page({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}

export function Header() {
  return (
    <header className="header">
      <h1>Boladas</h1>
      <p>Team-based auth + Supabase</p>
    </header>
  );
}
