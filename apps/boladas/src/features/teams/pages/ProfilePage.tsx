import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { ProfileDashboard } from "../dashboard/ProfileDashboard";

type HeaderStats = {
  games: number;
  confirmed: number;
  unavailable: number;
  teams: number;
  attendanceRate: number;
  upcomingGames: number;
  pendingCouch: number;
  hasGameToday: boolean;
  hasPendingCouchToday: boolean;
  hasPendingCouchYesterday: boolean;
};

type VoteState = "ball" | "couch" | "hospital";

const EMPTY_STATS: HeaderStats = {
  games: 0,
  confirmed: 0,
  unavailable: 0,
  teams: 0,
  attendanceRate: 0,
  upcomingGames: 0,
  pendingCouch: 0,
  hasGameToday: false,
  hasPendingCouchToday: false,
  hasPendingCouchYesterday: false,
};

const ROLE_PRIORITY = [
  "player",
  "manager",
  "team_admin",
  "secretary",
  "accountant",
  "member",
] as const;

const ROLE_LABELS: Record<(typeof ROLE_PRIORITY)[number], string> = {
  player: "Jogador",
  manager: "Manager",
  team_admin: "Admin do Time",
  secretary: "Secretario",
  accountant: "Tesoureiro",
  member: "Membro",
};

function resolveRoleLabel(roleGroups: string[][]) {
  for (const role of ROLE_PRIORITY) {
    if (roleGroups.some((roles) => roles.includes(role))) {
      return ROLE_LABELS[role];
    }
  }
  return "Jogador";
}

function getDayDiffFromToday(isoDate: string, todayStart: Date) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((dateStart.getTime() - todayStart.getTime()) / MS_PER_DAY);
}

export function ProfilePage() {
  const { sessionUserId, sessionEmail } = useAuth();
  const { memberships } = useTeams();
  const teamIds = useMemo(
    () => memberships.map((membership) => membership.teamId),
    [memberships],
  );
  const [displayName, setDisplayName] = useState("Jogador");
  const [headerLoading, setHeaderLoading] = useState(true);
  const [stats, setStats] = useState<HeaderStats>(EMPTY_STATS);

  const roleLabel = useMemo(
    () => resolveRoleLabel(memberships.map((membership) => membership.roles)),
    [memberships],
  );

  useEffect(() => {
    let cancelled = false;

    const loadHeader = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();
      const teamCount = teamIds.length;

      if (!supabase || !sessionUserId) {
        if (cancelled) return;
        setDisplayName(sessionEmail ?? "Jogador");
        setStats((prev) => ({ ...prev, teams: teamCount }));
        setHeaderLoading(false);
        return;
      }

      setHeaderLoading(true);

      const [profileResult, votesResult, upcomingResult, couchVotesResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", sessionUserId)
            .maybeSingle(),
          supabase
            .from("convocation_votes")
            .select("state")
            .eq("user_id", sessionUserId),
          teamCount > 0
            ? supabase
                .from("convocations")
                .select("id, scheduled_at")
                .in("team_id", teamIds)
                .gte("scheduled_at", todayStartIso)
                .in("status", ["open", "accepted"])
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from("convocation_votes")
            .select("convocation:convocations(status,scheduled_at)")
            .eq("user_id", sessionUserId)
            .eq("state", "couch"),
        ]);

      if (cancelled) return;

      if (profileResult.error) {
        console.error("Failed to load profile header name:", profileResult.error);
      }
      if (votesResult.error) {
        console.error("Failed to load profile header stats:", votesResult.error);
      }
      if (upcomingResult.error) {
        console.error(
          "Failed to load profile header upcoming games:",
          upcomingResult.error,
        );
      }
      if (couchVotesResult.error) {
        console.error(
          "Failed to load profile header open convocation alerts:",
          couchVotesResult.error,
        );
      }

      const profileName = profileResult.data?.display_name?.trim();
      const votes = (votesResult.data ?? []) as Array<{ state: VoteState }>;
      const upcomingRows = (upcomingResult.data ?? []) as Array<{
        scheduled_at?: string | null;
      }>;
      const couchVotes = (couchVotesResult.data ?? []) as Array<{
        convocation:
          | { status?: string | null; scheduled_at?: string | null }
          | { status?: string | null; scheduled_at?: string | null }[]
          | null;
      }>;
      const games = votes.length;
      const confirmed = votes.filter((vote) => vote.state === "ball").length;
      const unavailable = votes.filter(
        (vote) => vote.state === "hospital",
      ).length;
      const attendanceRate = games > 0 ? Math.round((confirmed / games) * 100) : 0;
      const upcomingGames = upcomingRows.length;
      const hasGameToday = upcomingRows.some((row) => {
        if (!row.scheduled_at) return false;
        return getDayDiffFromToday(row.scheduled_at, todayStart) === 0;
      });

      const openCouchConvocations = couchVotes
        .map((row) => {
          return Array.isArray(row.convocation)
            ? row.convocation[0]
            : row.convocation;
        })
        .filter(
          (
            convocation,
          ): convocation is { status?: string | null; scheduled_at: string } =>
            Boolean(convocation?.scheduled_at) && convocation?.status === "open",
        );

      const pendingCouch = openCouchConvocations.length;
      const hasPendingCouchToday = openCouchConvocations.some(
        (convocation) =>
          getDayDiffFromToday(convocation.scheduled_at, todayStart) === 0,
      );
      const hasPendingCouchYesterday = openCouchConvocations.some(
        (convocation) =>
          getDayDiffFromToday(convocation.scheduled_at, todayStart) === -1,
      );

      setDisplayName(profileName || sessionEmail || "Jogador");
      setStats({
        games,
        confirmed,
        unavailable,
        teams: teamCount,
        attendanceRate,
        upcomingGames,
        pendingCouch,
        hasGameToday,
        hasPendingCouchToday,
        hasPendingCouchYesterday,
      });
      setHeaderLoading(false);
    };

    void loadHeader();

    return () => {
      cancelled = true;
    };
  }, [sessionEmail, sessionUserId, teamIds]);

  const medals = useMemo(
    () => [
      {
        id: "attendance",
        icon: "🥇",
        badgeIcon: stats.attendanceRate >= 70 ? "🔥" : "📈",
        title: stats.attendanceRate >= 70 ? "Presenca de Ferro" : "Rumo ao Podio",
        detail: `${stats.attendanceRate}% de presenca`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(251,191,36,0.95))_drop-shadow(0_0_8px_rgba(251,191,36,0.65))]",
      },
      {
        id: "confirmed",
        icon: "⚽",
        badgeIcon: stats.confirmed >= 10 ? "🎯" : "🚀",
        title: stats.confirmed >= 10 ? "Craque da Semana" : "Em Aquecimento",
        detail: `${stats.confirmed} confirmacoes`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(56,189,248,0.95))_drop-shadow(0_0_8px_rgba(56,189,248,0.65))]",
      },
      {
        id: "teams",
        icon: "🛡️",
        badgeIcon: stats.teams > 1 ? "⭐" : "🤝",
        title: stats.teams > 1 ? "Veterano de Times" : "Camisa Fiel",
        detail: `${stats.teams} ${stats.teams === 1 ? "time" : "times"}`,
        badgeGlowClass:
          "[filter:drop-shadow(0_0_4px_rgba(168,85,247,0.95))_drop-shadow(0_0_8px_rgba(168,85,247,0.65))]",
      },
    ],
    [stats.attendanceRate, stats.confirmed, stats.teams],
  );

  const spotlightStats = useMemo(
    () => [
      {
        label: "Presencas",
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
        label: "Vitorias",
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
        label: "Jogo 3: vitoria",
        className: "bg-emerald-500 text-white",
      },
      {
        id: "m4",
        symbol: "✓",
        label: "Jogo 4: vitoria",
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="rounded-3xl bg-[var(--bg-surface)] p-5 shadow-mui sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Perfil</h2>
          {headerLoading && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              Atualizando
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
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
                  label: "Proximos jogos",
                  value: String(stats.upcomingGames),
                  tone: stats.hasGameToday
                    ? "text-emerald-500 dark:text-emerald-300"
                    : "text-primary-600 dark:text-primary-400",
                },
                {
                  label: "No sofa",
                  value: String(stats.pendingCouch),
                  tone: stats.hasPendingCouchToday
                    ? "text-red-500 dark:text-red-300"
                    : stats.hasPendingCouchYesterday
                      ? "text-orange-500 dark:text-orange-300"
                      : "text-amber-500 dark:text-amber-300",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-2 text-center"
                >
                  <p className={`text-base font-bold ${stat.tone}`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
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
            </section>

            <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Star Stats
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Rolling 5
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
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {spotlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-2.5 text-center"
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
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </header>

      <ProfileDashboard withPadding={false} />
    </div>
  );
}
