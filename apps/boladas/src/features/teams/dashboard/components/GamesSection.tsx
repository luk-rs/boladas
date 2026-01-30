export function GamesSection() {
  return (
    <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Jogos
          </p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Jogos em que estou inscrito
          </h2>
        </div>
        <span className="text-2xl">🏟️</span>
      </header>
      <div className="mt-4 space-y-3">
        <div className="h-16 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
        <div className="h-16 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-app)]" />
      </div>
    </section>
  );
}
