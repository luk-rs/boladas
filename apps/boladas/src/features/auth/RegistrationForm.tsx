import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function RegistrationForm({ onCancel }: { onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    seasonStart: "",
    holidayStart: "",
  });
  const [status, setStatus] = useState<
    "idle" | "authenticating" | "registering" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);

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
              <input
                type="date"
                value={formData.seasonStart}
                onChange={(e) =>
                  setFormData({ ...formData, seasonStart: e.target.value })
                }
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent focus:border-primary-500 p-4 outline-none transition-all text-[var(--text-primary)] font-medium"
              />
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
              <input
                type="date"
                value={formData.holidayStart}
                onChange={(e) =>
                  setFormData({ ...formData, holidayStart: e.target.value })
                }
                className="w-full rounded-2xl bg-[var(--bg-app)] border-2 border-transparent focus:border-primary-500 p-4 outline-none transition-all text-[var(--text-primary)] font-medium"
              />
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
              onClick={handleGoogleSignIn}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white dark:bg-slate-800 py-4 font-bold text-slate-700 dark:text-slate-200 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 transition-all hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-lg active:scale-95"
            >
              <img
                src="/assets/providers/google.svg"
                alt="Google"
                className="h-6 w-6 transition-transform group-hover:scale-110"
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
    </div>
  );
}
