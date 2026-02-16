import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageScaffold } from "../../../shared/layout/PageScaffold";
import { SurfaceTile } from "../../../shared/layout/SurfaceTile";
import { ProfileProvider, useProfileContext } from "../context/ProfileContext";

export function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfilePageView />
    </ProfileProvider>
  );
}

function ProfilePageView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    state: { displayName, roleLabel, headerLoading, stats },
  } = useProfileContext();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "games") {
      navigate("/games", { replace: true });
      return;
    }
    if (tabParam === "convocations") {
      navigate("/convocations", { replace: true });
      return;
    }
    if (tabParam === "teams") {
      navigate("/teams", { replace: true });
    }
  }, [navigate, searchParams]);

  const medals = useMemo(
    () => [
      {
        id: "attendance",
        icon: "🥇",
        badgeIcon: stats.attendanceRate >= 70 ? "🔥" : "📈",
        title: stats.attendanceRate >= 70 ? "Presença de Ferro" : "Rumo ao Pódio",
        detail: `${stats.attendanceRate}% de presença`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(251,191,36,0.95))_drop-shadow(0_0_8px_rgba(251,191,36,0.65))]",
      },
      {
        id: "confirmed",
        icon: "⚽",
        badgeIcon: stats.confirmed >= 10 ? "🎯" : "🚀",
        title: stats.confirmed >= 10 ? "Craque da Semana" : "Em Aquecimento",
        detail: `${stats.confirmed} confirmações`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(56,189,248,0.95))_drop-shadow(0_0_8px_rgba(56,189,248,0.65))]",
      },
      {
        id: "teams",
        icon: "🛡️",
        badgeIcon: stats.teams > 1 ? "⭐" : "🤝",
        title: stats.teams > 1 ? "Veterano de equipas" : "Camisa Fiel",
        detail: `${stats.teams} ${stats.teams === 1 ? "equipa" : "equipas"}`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(168,85,247,0.95))_drop-shadow(0_0_8px_rgba(168,85,247,0.65))]",
      },
    ],
    [stats.attendanceRate, stats.confirmed, stats.teams],
  );

  const spotlightStats = useMemo(
    () => [
      {
        label: "Presenças",
        value: String(stats.confirmed),
        available: true,
      },
      {
        label: "% Pres.",
        value: `${stats.attendanceRate}%`,
        available: true,
      },
      {
        label: "xG",
        value: "—",
        available: false,
      },
      {
        label: "xG Eq.",
        value: "—",
        available: false,
      },
      {
        label: "Vitórias",
        value: "—",
        available: false,
      },
      {
        label: "% Vit.",
        value: "—",
        available: false,
      },
    ],
    [stats.attendanceRate, stats.confirmed],
  );

  const rollingFive = useMemo(
    () => [
      {
        id: "m1",
        symbol: "−",
        label: "Jogo 1: sem resultado",
        className: "bg-slate-500 text-slate-50",
      },
      {
        id: "m2",
        symbol: "×",
        label: "Jogo 2: derrota",
        className: "bg-red-500 text-white",
      },
      {
        id: "m3",
        symbol: "✓",
        label: "Jogo 3: vitória",
        className: "bg-emerald-500 text-white",
      },
      {
        id: "m4",
        symbol: "✓",
        label: "Jogo 4: vitória",
        className: "bg-emerald-500 text-white",
      },
      {
        id: "m5",
        symbol: "◌",
        label: "Jogo 5: por disputar",
        className:
          "bg-transparent text-slate-300 ring-1 ring-slate-300 dark:text-slate-400 dark:ring-slate-500",
      },
    ],
    [],
  );

  return (
    <PageScaffold className="space-y-6">
      <section className="rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Perfil</h2>
          {headerLoading && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              Atualizando
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <SurfaceTile variant="soft" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--bg-surface)] bg-primary-100 text-primary-600 shadow dark:bg-primary-900/30 dark:text-primary-400">
                <span className="text-3xl">👤</span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-[var(--text-primary)]">
                  {displayName}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">{roleLabel}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                {
                  label: "Próximos jogos",
                  value: String(stats.upcomingGames),
                  tone: stats.hasGameToday
                    ? "text-emerald-500 dark:text-emerald-300"
                    : "text-primary-600 dark:text-primary-400",
                },
                {
                  label: "No sofá",
                  value: String(stats.pendingCouch),
                  tone: stats.hasPendingCouchToday
                    ? "text-red-500 dark:text-red-300"
                    : stats.hasPendingCouchYesterday
                      ? "text-orange-500 dark:text-orange-300"
                      : "text-amber-500 dark:text-amber-300",
                },
              ].map((stat) => (
                <SurfaceTile
                  key={stat.label}
                  variant="strong"
                  className="p-2 text-center"
                >
                  <p className={`text-base font-bold ${stat.tone}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                </SurfaceTile>
              ))}
            </div>
          </SurfaceTile>

          <div className="grid gap-4">
            <SurfaceTile variant="soft">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Medalhas
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {medals.map((medal) => (
                  <article key={medal.id} className="group relative flex items-start">
                    <button
                      type="button"
                      aria-label={`${medal.title}: ${medal.detail}`}
                      title={`${medal.title}: ${medal.detail}`}
                      className="relative flex h-14 w-14 items-center justify-center transition-transform group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5"
                    >
                      <span className="relative inline-flex h-11 w-11 items-center justify-center">
                        <span className="text-4xl leading-none">{medal.icon}</span>
                        <span
                          className={`absolute bottom-0 right-0 z-10 translate-x-[28%] translate-y-[28%] text-lg leading-none ${medal.badgeGlowClass}`}
                        >
                          {medal.badgeIcon}
                        </span>
                      </span>
                    </button>

                    <div className="pointer-events-none absolute -top-12 left-1/2 z-10 min-w-max -translate-x-1/2 rounded-xl bg-slate-900/90 px-2 py-1.5 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                      <p className="text-[10px] font-bold">{medal.title}</p>
                      <p className="text-[10px] font-medium opacity-90">{medal.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </SurfaceTile>

            <SurfaceTile variant="soft">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Estatísticas em destaque
              </p>
              <SurfaceTile
                variant="strong"
                className="mt-3 flex items-center justify-between px-3 py-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Últimos 5
                </p>
                <div className="flex items-center gap-1.5">
                  {rollingFive.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      aria-label={item.label}
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${item.className}`}
                    >
                      {item.symbol}
                    </button>
                  ))}
                </div>
              </SurfaceTile>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {spotlightStats.map((stat) => (
                  <SurfaceTile
                    key={stat.label}
                    variant="strong"
                    className="px-2 py-2.5 text-center"
                  >
                    <p
                      className={`text-base font-bold ${
                        stat.available
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      {stat.label}
                    </p>
                  </SurfaceTile>
                ))}
              </div>
            </SurfaceTile>
          </div>
        </div>
      </section>
    </PageScaffold>
  );
}
