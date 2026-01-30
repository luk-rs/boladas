import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { Toggle } from "../../../components/ui/Toggle";

const MANAGER_ROLES = ["team_admin", "manager"];

type ThemeMode = "light" | "dark";

type MenuPosition = "left" | "right";

export function SettingsPage() {
  const { sessionUserId } = useAuth();
  const {
    memberships,
    createGenericInvite,
    activeTeamId,
    error: hookError,
    loading: hookLoading,
  } = useTeams(sessionUserId, false);

  const [menuPosition, setMenuPosition] = useState<MenuPosition>("right");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const savedPos = localStorage.getItem("menu-position") as MenuPosition;
    if (savedPos) setMenuPosition(savedPos);

    const savedTheme = localStorage.getItem("theme") as ThemeMode;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const togglePosition = (pos: MenuPosition) => {
    setMenuPosition(pos);
    localStorage.setItem("menu-position", pos);
    window.dispatchEvent(new Event("menu-position-change"));
  };

  const toggleTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event("theme-change"));
  };

  const activeMembership =
    memberships.find((m) => m.teamId === activeTeamId) ?? memberships[0];
  const canManageInvites = Boolean(
    activeMembership?.roles.some((role) => MANAGER_ROLES.includes(role)),
  );

  const handleCreateInvite = async () => {
    if (!activeMembership?.teamId) return;
    setInviteLoading(true);
    setInviteError(null);
    const token = await createGenericInvite(activeMembership.teamId);
    if (token) {
      setInviteToken(token);
    } else {
      setInviteError("Falha ao gerar convite. Tente novamente.");
    }
    setInviteLoading(false);
  };

  const copyToClipboard = () => {
    if (!inviteToken) return;
    const link = `${window.location.origin}/join/${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Preferências e gestão de convites
        </p>
      </header>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Preferências
            </p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Ajustes da aplicação
            </h3>
          </div>
          <span className="text-2xl">⚙️</span>
        </header>
        <div className="space-y-4 divide-y divide-[var(--border-color)]">
          <Toggle
            label="Menu à Direita"
            subLabel="Alternar posição do menu radial"
            checked={menuPosition === "right"}
            onChange={(checked) => togglePosition(checked ? "right" : "left")}
            icon="↕️"
          />
          <Toggle
            label="Tema Escuro"
            subLabel="Habilitar aparência escura"
            checked={theme === "dark"}
            onChange={(checked) => toggleTheme(checked ? "dark" : "light")}
            icon={theme === "dark" ? "🌙" : "☀️"}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg-surface)] p-5 shadow-mui">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Convites
            </p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Gestão de convites
            </h3>
          </div>
          <span className="text-2xl">🔗</span>
        </header>
        {hookLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Verificando permissões...
            </p>
          </div>
        ) : !activeMembership ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Você ainda não participa de nenhum time.
          </p>
        ) : !canManageInvites ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Convites disponíveis apenas para administradores ou managers.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Gere um link para convidar novos jogadores para{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {activeMembership.teamName}
              </span>
              . Eles entrarão automaticamente como <strong>Membro</strong>.
            </p>

            {!inviteToken ? (
              <button
                onClick={handleCreateInvite}
                disabled={inviteLoading}
                className="w-full rounded-xl bg-primary-600 py-3 font-bold text-white shadow-lg shadow-primary-600/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {inviteLoading ? "Gerando..." : "🔗 Gerar Link de Convite"}
              </button>
            ) : (
              <div className="space-y-3 bg-[var(--bg-app)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                  Link Ativo (7 dias)
                </div>
                <div className="break-all font-mono text-sm bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-color)]">
                  {`${window.location.origin}/join/${inviteToken}`}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`w-full rounded-lg py-2 font-bold text-sm transition-all ${
                    copyFeedback
                      ? "bg-green-500 text-white"
                      : "bg-[var(--bg-surface)] text-primary-600 border border-primary-200"
                  }`}
                >
                  {copyFeedback ? "Copiado!" : "Copiar Link"}
                </button>
              </div>
            )}
            {inviteError && (
              <p className="text-xs text-red-500 font-bold">{inviteError}</p>
            )}
            {hookError && (
              <p className="text-xs text-red-500">{hookError}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
