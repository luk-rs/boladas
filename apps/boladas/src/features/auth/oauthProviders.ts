export const AUTH_ENABLED_PROVIDERS_ENV_VAR = "VITE_AUTH_ENABLED_PROVIDERS";

export type OAuthProviderId = "google" | "azure" | "facebook";

export type OAuthProviderConfig = {
  id: OAuthProviderId;
  label: string;
  iconPath: string;
  scopes?: string;
};

export const OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [
  {
    id: "google",
    label: "Google",
    iconPath: "/assets/providers/google.svg",
  },
  {
    id: "azure",
    label: "Microsoft",
    iconPath: "/assets/providers/microsoft.svg",
    scopes: "openid profile email",
  },
  {
    id: "facebook",
    label: "Meta",
    iconPath: "/assets/providers/facebook.svg",
  },
] as const;

const ALL_PROVIDER_IDS = new Set<OAuthProviderId>(
  OAUTH_PROVIDERS.map((provider) => provider.id),
);

const enabledProviderIds = parseEnabledProviders(
  import.meta.env.VITE_AUTH_ENABLED_PROVIDERS,
);

function parseEnabledProviders(raw: string | undefined): Set<OAuthProviderId> {
  if (!raw) return new Set<OAuthProviderId>();

  const providerIds = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is OAuthProviderId =>
      ALL_PROVIDER_IDS.has(item as OAuthProviderId),
    );

  return new Set<OAuthProviderId>(providerIds);
}

export function getOAuthProvider(providerId: OAuthProviderId) {
  const provider = OAUTH_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) {
    throw new Error(`Unsupported OAuth provider: ${providerId}`);
  }
  return provider;
}

export function isProviderEnabled(providerId: OAuthProviderId) {
  return enabledProviderIds.has(providerId);
}

export function hasEnabledProviders() {
  return enabledProviderIds.size > 0;
}
