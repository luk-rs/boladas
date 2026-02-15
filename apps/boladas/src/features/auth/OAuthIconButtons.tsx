import {
  OAUTH_PROVIDERS,
  isProviderEnabled,
  type OAuthProviderId,
} from "./oauthProviders";

type OAuthIconButtonsProps = {
  loadingProvider: OAuthProviderId | null;
  onSelectProvider: (providerId: OAuthProviderId) => void;
  disabled?: boolean;
  title?: string;
  ariaLabelPrefix?: string;
};

export function OAuthIconButtons({
  loadingProvider,
  onSelectProvider,
  disabled = false,
  title = "Continuar com",
  ariaLabelPrefix = "Entrar com",
}: OAuthIconButtonsProps) {
  const anyLoading = loadingProvider !== null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3">
        <div className="h-px flex-1 bg-primary-500/40" />
        <span className="text-base font-semibold leading-none text-[var(--text-secondary)]">
          {title}
        </span>
        <div className="h-px flex-1 bg-primary-500/40" />
      </div>

      <div className="flex items-center justify-center gap-5">
        {OAUTH_PROVIDERS.map((provider) => {
          const providerEnabled = isProviderEnabled(provider.id);
          const isLoading = loadingProvider === provider.id;
          const buttonDisabled = disabled || anyLoading || !providerEnabled;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider(provider.id)}
              disabled={buttonDisabled}
              aria-label={`${ariaLabelPrefix} ${provider.label}`}
              title={providerEnabled ? provider.label : `${provider.label} indisponível`}
              className={`group block h-12 w-12 overflow-hidden rounded-xl transition-all ${
                buttonDisabled
                  ? "cursor-not-allowed opacity-45"
                  : "hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20 active:translate-y-0"
              }`}
            >
              {isLoading ? (
                <div className="flex h-full w-full items-center justify-center bg-[var(--bg-app)]/80">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                </div>
              ) : (
                <img
                  src={provider.iconPath}
                  alt=""
                  aria-hidden="true"
                  className={`h-full w-full object-contain transition-transform ${
                    buttonDisabled ? "opacity-70 grayscale" : "group-hover:scale-105"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
