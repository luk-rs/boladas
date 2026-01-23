import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { useTeams } from "../useTeams";
import { CollapsibleSection } from "../../../components/ui/CollapsibleSection";

export function TeamSettingsPage() {
  const { sessionUserId } = useAuth();
  const {
    memberships,
    createGenericInvite,
    activeTeamId,
    error: hookError,
  } = useTeams(sessionUserId, false);

  // Find current active team role
  const activeMembership =
    memberships.find((m) => m.teamId === activeTeamId) || memberships[0];
  const isAdminOrManager = activeMembership?.roles.some((r) =>
    ["team_admin", "manager"].includes(r),
  );

  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdminOrManager) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-center p-6">
        <div>
          <h2 className="text-xl font-bold text-red-500 mb-2">Acesso Negado</h2>
          <p className="text-[var(--text-secondary)]">
            Você não tem permissão para acessar as configurações deste time.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateInvite = async () => {
    if (!activeMembership?.teamId) return;
    setLoading(true);
    setError(null);
    const token = await createGenericInvite(activeMembership.teamId);
    if (token) {
      setInviteToken(token);
    } else {
      setError("Falha ao gerar convite. Tente novamente.");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!inviteToken) return;
    const link = `${window.location.origin}/join/${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Configurações do Time
        </h2>
        <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">
          {activeMembership?.teamName}
        </p>
      </header>

      <CollapsibleSection title="Convites" defaultOpen={true}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Gere um link para convidar novos jogadores. Eles entrarão
            automaticamente como <strong>Membro</strong>.
          </p>

          {!inviteToken ? (
            <button
              onClick={handleCreateInvite}
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 py-3 font-bold text-white shadow-lg shadow-primary-600/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Gerando..." : "🔗 Gerar Link de Convite"}
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
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          {hookError && <p className="text-xs text-red-500">{hookError}</p>}
        </div>
      </CollapsibleSection>

      {/* Roster Managment Placeholder */}
      <CollapsibleSection title="Elenco">
        <p className="text-center text-sm text-[var(--text-secondary)] py-4 italic">
          Gestão de elenco em breve...
        </p>
      </CollapsibleSection>
    </div>
  );
}
