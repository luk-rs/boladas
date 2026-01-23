import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { WheelDatePicker } from "../../components/ui/WheelDatePicker";
import { WheelTimePicker } from "../../components/ui/WheelTimePicker";
import { WheelDayOfWeekPicker } from "../../components/ui/WheelDayOfWeekPicker";

export function RegistrationForm({ onCancel }: { onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    seasonStart: "",
    holidayStart: "",
    gameDefinitions: [] as { dayOfWeek: number; startTime: string }[],
  });
  const [status, setStatus] = useState<
    "idle" | "authenticating" | "registering" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);

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

  const isFormValid =
    formData.name &&
    formData.seasonStart &&
    formData.gameDefinitions.length > 0;

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

  const handleGoogleSignIn = async () => {
    if (!formData.name || !formData.seasonStart || !formData.holidayStart) {
      setError("Todos os campos são obrigatórios.");
      return;
    }
    if (!supabase) return;

    setError(null);
    setStatus("authenticating");

    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
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
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent focus:border-primary-500 p-4 outline-none transition-all text-[var(--text-primary)] font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase px-1">
                Data Início da Temporada
              </label>
              <div
                onClick={() => setActivePicker("seasonStart")}
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent hover:border-primary-500/50 p-4 transition-all text-[var(--text-primary)] font-medium cursor-pointer flex justify-between items-center"
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
                  <p className="text-[10px] text-center text-[var(--text-secondary)] py-2 italic opacity-60">
                    Nenhum jogo definido. Adicione pelo menos um.
                  </p>
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
                        className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 border border-red-100">
              <p className="text-xs text-red-600 font-bold text-center">
                {error}
              </p>
            </div>
          )}

          <div className="pt-2 space-y-4">
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
