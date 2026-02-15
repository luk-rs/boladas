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
};

type VoteState = "ball" | "couch" | "hospital";

const EMPTY_STATS: HeaderStats = {
  games: 0,
  confirmed: 0,
  unavailable: 0,
  teams: 0,
  attendanceRate: 0,
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

export function ProfilePage() {
  const { sessionUserId, sessionEmail } = useAuth();
  const { memberships } = useTeams();
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
      const teamCount = memberships.length;

      if (!supabase || !sessionUserId) {
        if (cancelled) return;
        setDisplayName(sessionEmail ?? "Jogador");
        setStats((prev) => ({ ...prev, teams: teamCount }));
        setHeaderLoading(false);
        return;
      }

      setHeaderLoading(true);

      const [profileResult, votesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", sessionUserId)
          .maybeSingle(),
        supabase.from("convocation_votes").select("state").eq("user_id", sessionUserId),
      ]);

      if (cancelled) return;

      if (profileResult.error) {
        console.error("Failed to load profile header name:", profileResult.error);
      }
      if (votesResult.error) {
        console.error("Failed to load profile header stats:", votesResult.error);
      }

      const profileName = profileResult.data?.display_name?.trim();
      const votes = (votesResult.data ?? []) as Array<{ state: VoteState }>;
      const games = votes.length;
      const confirmed = votes.filter((vote) => vote.state === "ball").length;
      const unavailable = votes.filter(
        (vote) => vote.state === "hospital",
      ).length;
      const attendanceRate = games > 0 ? Math.round((confirmed / games) * 100) : 0;

      setDisplayName(profileName || sessionEmail || "Jogador");
      setStats({
        games,
        confirmed,
        unavailable,
        teams: teamCount,
        attendanceRate,
      });
      setHeaderLoading(false);
    };

    void loadHeader();

    return () => {
      cancelled = true;
    };
  }, [memberships.length, sessionEmail, sessionUserId]);

  const medals = useMemo(
    () => [
      {
        id: "attendance",
        icon: "🥇",
        title: stats.attendanceRate >= 70 ? "Presenca de Ferro" : "Rumo ao Podio",
        detail: `${stats.attendanceRate}% de presenca`,
      },
      {
        id: "confirmed",
        icon: "⚽",
        title: stats.confirmed >= 10 ? "Craque da Semana" : "Em Aquecimento",
        detail: `${stats.confirmed} confirmacoes`,
      },
      {
        id: "teams",
        icon: "🛡️",
        title: stats.teams > 1 ? "Veterano de Times" : "Camisa Fiel",
        detail: `${stats.teams} ${stats.teams === 1 ? "time" : "times"}`,
      },
    ],
    [stats.attendanceRate, stats.confirmed, stats.teams],
  );

  const spotlightStats = useMemo(
    () => [
      { label: "Jogos", value: String(stats.games) },
      { label: "Confirmados", value: String(stats.confirmed) },
      { label: "Presenca", value: `${stats.attendanceRate}%` },
      { label: "Ausencias", value: String(stats.unavailable) },
    ],
    [stats],
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

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(280px,auto)_minmax(0,1fr)]">
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
                { label: "Jogos", value: String(stats.games) },
                { label: "Presenca", value: `${stats.attendanceRate}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-2 text-center"
                >
                  <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                    {stat.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Medalhas
              </p>
              <div className="mt-3 space-y-2">
                {medals.map((medal) => (
                  <article
                    key={medal.id}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2"
                  >
                    <span className="text-lg">{medal.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                        {medal.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {medal.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-[var(--bg-app)]/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Star Stats
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {spotlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-2.5 text-center"
                  >
                    <p className="text-base font-bold text-primary-600 dark:text-primary-400">
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
