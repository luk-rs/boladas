import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { WheelDatePicker } from "../../components/ui/WheelDatePicker";
import { WheelTimePicker } from "../../components/ui/WheelTimePicker";
import { WheelDayOfWeekPicker } from "../../components/ui/WheelDayOfWeekPicker";

const REGISTRATION_ERROR_KEY = "boladas:registration_error";
const REGISTRATION_LOCK_KEY = "boladas:registration_lock";

export function RegistrationForm({
  onCancel,
  initialError = null,
}: {
  onCancel: () => void;
  initialError?: string | null;
}) {
  const [formData, setFormData] = useState({
    name: "",
    seasonStart: "",
    holidayStart: "",
    gameDefinitions: [] as { dayOfWeek: number; startTime: string }[],
  });
  const [status, setStatus] = useState<
    "idle" | "authenticating" | "registering" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(initialError);

  const [activePicker, setActivePicker] = useState<
    "seasonStart" | "holidayStart" | "addGame" | null
  >(null);
  const [newGame, setNewGame] = useState({ dayOfWeek: 1, startTime: "19:00" });

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "dd/mm";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return "dd/mm";
  };

  const hasTeamName = formData.name.trim().length > 0;
  const hasSeasonStart = Boolean(formData.seasonStart);
  const hasGameDefinition = formData.gameDefinitions.length > 0;
  const isFormValid = hasTeamName && hasSeasonStart && hasGameDefinition;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  useEffect(() => {
    if (status !== "authenticating" || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("registering");
      }
    });

    return () => subscription.unsubscribe();
  }, [status]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const handleGoogleSignIn = async () => {
    if (!hasTeamName || !hasSeasonStart) {
      setError("O nome do time e a data de início são obrigatórios.");
      return;
    }
    if (!supabase) return;

    setError(null);
    setStatus("authenticating");

    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    localStorage.removeItem(REGISTRATION_ERROR_KEY);
    localStorage.removeItem(REGISTRATION_LOCK_KEY);
    localStorage.setItem("boladas:registration_data", JSON.stringify(formData));

    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: !isStandalone,
        redirectTo: isStandalone
          ? window.location.origin
          : `${window.location.origin}?popup=true`,
      },
    });

    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }

    if (!isStandalone && data?.url) {
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.url,
        "google-auth",
        `width=${width},height=${height},top=${top},left=${left},popup=yes`,
      );
    }
  };

  if (status === "authenticating" || status === "registering") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
        <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-8 shadow-mui text-center space-y-6 animate-pulse">
          <div className="flex justify-center">
            <div className="h-16 w-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {status === "authenticating"
              ? "Autenticando..."
              : "Criando Time..."}
          </h2>
          <p className="text-[var(--text-secondary)]">
            {status === "authenticating"
              ? "Complete o login na janela que se abriu."
              : "Estamos preparando seu novo espaço de jogo."}
          </p>
          {status === "authenticating" && (
            <button
              onClick={() => setStatus("idle")}
              className="text-sm font-bold text-primary-500 hover:text-primary-600 underline"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
        <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] p-8 shadow-mui text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] text-green-500">
            Sucesso!
          </h2>
          <p className="text-[var(--text-secondary)]">
            Seu time foi criado com sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6">
      <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in duration-500">
        <section className="rounded-3xl bg-[var(--bg-surface)] p-8 shadow-mui space-y-6">
          <header className="text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Registrar Novo Time
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold">
              Configurações iniciais
            </p>
          </header>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase px-1">
                Nome do Time
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Dream Team FC"
                className={`w-full rounded-2xl bg-[var(--bg-app)] border-2 p-4 outline-none transition-all text-[var(--text-primary)] font-medium ${
                  hasTeamName
                    ? "border-transparent focus:border-primary-500"
                    : "border-slate-300/35 focus:border-slate-300/50 ring-1 ring-slate-300/10"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase px-1">
                Data Início da Temporada
              </label>
              <div
                onClick={() => setActivePicker("seasonStart")}
                className={`w-full rounded-2xl bg-[var(--bg-app)] border-2 hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center ${
                  hasSeasonStart
                    ? "border-transparent"
                    : "border-slate-300/35 ring-1 ring-slate-300/10"
                }`}
              >
                <span>{formatDate(formData.seasonStart)}</span>
                <span className="text-lg opacity-40">📅</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between px-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                  Início das Férias
                </label>
                <span className="text-[10px] text-primary-500 font-bold uppercase">
                  Opcional
                </span>
              </div>
              <div
                onClick={() => setActivePicker("holidayStart")}
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center"
              >
                <span>{formatDate(formData.holidayStart)}</span>
                <span className="text-lg opacity-40">📅</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                  Horário dos Jogos
                </label>
                <button
                  onClick={() => setActivePicker("addGame")}
                  className="text-[10px] font-black bg-primary-500 text-white px-3 py-1 rounded-full shadow-md active:scale-95"
                >
                  + ADICIONAR
                </button>
              </div>

              <div className="space-y-2">
                {formData.gameDefinitions.length === 0 ? (
                  <div className="rounded-xl border border-slate-300/25 bg-slate-500/5 px-3 py-2">
                    <p className="text-[10px] text-center text-[var(--text-secondary)] italic opacity-90">
                      Nenhum jogo definido. Adicione pelo menos um.
                    </p>
                  </div>
                ) : (
                  formData.gameDefinitions.map((game, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[var(--bg-app)] p-3 rounded-xl border border-[var(--border-color)]"
                    >
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-lg">
                          {dayNames[game.dayOfWeek]}
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {game.startTime}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            gameDefinitions: formData.gameDefinitions.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                        aria-label="Remover horário"
                        title="Remover horário"
                        className="inline-flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 border border-red-400/25 backdrop-blur-sm">
              <p className="text-xs text-red-300 font-bold text-center">
                {error}
              </p>
            </div>
          )}

          <div className="pt-2 space-y-4">
            {!isFormValid && (
              <div className="rounded-xl border border-slate-300/25 bg-slate-500/10 p-3">
                <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                  Para desbloquear "Registrar com Google":
                </p>
                <ul className="mt-2 space-y-1">
                  <li
                    className={`text-xs font-semibold ${
                      hasTeamName
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {hasTeamName ? "✓" : "•"} Nome do time
                  </li>
                  <li
                    className={`text-xs font-semibold ${
                      hasSeasonStart
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {hasSeasonStart ? "✓" : "•"} Data de início da temporada
                  </li>
                  <li
                    className={`text-xs font-semibold ${
                      hasGameDefinition
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {hasGameDefinition ? "✓" : "•"} Pelo menos um horário de
                    jogo
                  </li>
                </ul>
              </div>
            )}
            <button
              disabled={!isFormValid}
              onClick={handleGoogleSignIn}
              className={`group relative flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-bold transition-all active:scale-95 ${
                isFormValid
                  ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-lg"
                  : "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <img
                src="/assets/providers/google.svg"
                alt="Google"
                className={`h-6 w-6 transition-transform ${isFormValid ? "group-hover:scale-110" : "grayscale opacity-50"}`}
              />
              <span>Registrar com Google</span>
            </button>

            <button
              onClick={onCancel}
              className="w-full py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Voltar para o Login
            </button>
          </div>
        </section>
      </div>

      {/* Date Picker Bottom Sheet / Overlay */}
      {activePicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 transition-all">
          <div className="animate-in slide-in-from-bottom duration-300 w-full max-w-[450px] mx-auto bg-[var(--bg-app)] rounded-t-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                {activePicker === "seasonStart" && "Início da Temporada"}
                {activePicker === "holidayStart" && "Início das Férias"}
                {activePicker === "addGame" && "Novo Horário de Jogo"}
              </h3>
              <button
                onClick={() => {
                  if (activePicker === "addGame") {
                    setFormData({
                      ...formData,
                      gameDefinitions: [...formData.gameDefinitions, newGame],
                    });
                  } else if (
                    activePicker === "seasonStart" &&
                    !formData.seasonStart
                  ) {
                    setFormData({
                      ...formData,
                      seasonStart: new Date().toISOString().split("T")[0],
                    });
                  } else if (
                    activePicker === "holidayStart" &&
                    !formData.holidayStart
                  ) {
                    setFormData({
                      ...formData,
                      holidayStart: new Date().toISOString().split("T")[0],
                    });
                  }
                  setActivePicker(null);
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary-600/20 active:scale-95"
              >
                Concluir
              </button>
            </div>

            {activePicker === "addGame" ? (
              <div className="flex gap-4">
                <div className="flex-[2]">
                  <WheelDayOfWeekPicker
                    value={newGame.dayOfWeek}
                    onChange={(v) => setNewGame({ ...newGame, dayOfWeek: v })}
                  />
                </div>
                <div className="flex-[3]">
                  <WheelTimePicker
                    value={newGame.startTime}
                    onChange={(v) => setNewGame({ ...newGame, startTime: v })}
                  />
                </div>
              </div>
            ) : (
              <WheelDatePicker
                showYear={false}
                value={
                  (formData as any)[activePicker] ||
                  new Date().toISOString().split("T")[0]
                }
                onChange={(val) =>
                  setFormData({ ...formData, [activePicker]: val })
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
