import { supabase } from "../../lib/supabase";
import {
  clearPendingRegistrationData,
  clearRegistrationErrorAndLock,
  persistPendingRegistrationData,
  type PendingRegistrationData,
} from "./registrationStorage";
import { getOAuthProvider, type OAuthProviderId } from "./oauthProviders";

type ManualNavigation = "assign" | "popup" | "none";

type StartOAuthFlowParams = {
  provider: OAuthProviderId;
  redirectTo: string;
  skipBrowserRedirect: boolean;
  navigation: ManualNavigation;
  popupName?: string;
};

export type OAuthStartResult = { ok: true } | { ok: false; error: string };

export function buildLoginRedirectUrl(inviteToken: string | null) {
  if (inviteToken) {
    return `${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}`;
  }
  return window.location.origin;
}

export function buildJoinRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function getRegistrationRedirectConfig() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return {
    redirectTo: isStandalone
      ? window.location.origin
      : `${window.location.origin}?popup=true`,
    skipBrowserRedirect: !isStandalone,
    navigation: isStandalone ? ("none" as const) : ("popup" as const),
  };
}

function openCenteredPopup(url: string, popupName: string) {
  const width = 500;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  return window.open(
    url,
    popupName,
    `width=${width},height=${height},top=${top},left=${left},popup=yes`,
  );
}

async function startOAuthFlow(
  params: StartOAuthFlowParams,
): Promise<OAuthStartResult> {
  if (!supabase) {
    return { ok: false, error: "Supabase auth não está configurado." };
  }

  const provider = getOAuthProvider(params.provider);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.id,
    options: {
      redirectTo: params.redirectTo,
      skipBrowserRedirect: params.skipBrowserRedirect,
      queryParams: provider.scopes ? { scope: provider.scopes } : undefined,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!params.skipBrowserRedirect) {
    return { ok: true };
  }

  if (!data?.url) {
    return { ok: false, error: `Não foi possível iniciar login com ${provider.label}.` };
  }

  if (params.navigation === "popup") {
    const popup = openCenteredPopup(data.url, params.popupName ?? "oauth-auth");
    if (!popup) {
      window.location.assign(data.url);
    }
    return { ok: true };
  }

  if (params.navigation === "assign") {
    window.location.assign(data.url);
  }

  return { ok: true };
}

export async function startLoginOAuth(params: {
  provider: OAuthProviderId;
  inviteToken: string | null;
}): Promise<OAuthStartResult> {
  if (params.inviteToken) {
    clearPendingRegistrationData();
    clearRegistrationErrorAndLock();
  }

  return startOAuthFlow({
    provider: params.provider,
    redirectTo: buildLoginRedirectUrl(params.inviteToken),
    skipBrowserRedirect: true,
    navigation: "assign",
  });
}

export async function startRegistrationOAuth(params: {
  provider: OAuthProviderId;
  registrationData: PendingRegistrationData;
}): Promise<OAuthStartResult> {
  persistPendingRegistrationData(params.registrationData);

  const redirectConfig = getRegistrationRedirectConfig();

  return startOAuthFlow({
    provider: params.provider,
    redirectTo: redirectConfig.redirectTo,
    skipBrowserRedirect: redirectConfig.skipBrowserRedirect,
    navigation: redirectConfig.navigation,
    popupName: "oauth-auth",
  });
}

export async function startJoinOAuth(params: {
  provider: OAuthProviderId;
}): Promise<OAuthStartResult> {
  clearPendingRegistrationData();
  clearRegistrationErrorAndLock();

  return startOAuthFlow({
    provider: params.provider,
    redirectTo: buildJoinRedirectUrl(),
    skipBrowserRedirect: true,
    navigation: "assign",
  });
}
