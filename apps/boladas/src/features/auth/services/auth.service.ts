import { supabase } from "../../../shared/api/supabase/client";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export type PendingRegistrationPayload = {
  name: string;
  seasonStart: string;
  holidayStart: string | null;
  gameDefinitions: unknown[];
};

type OAuthSignInParams = {
  provider: string;
  redirectTo: string;
  skipBrowserRedirect: boolean;
  scope?: string;
};

const SUPABASE_UNAVAILABLE_ERROR = "Cliente Supabase indisponível.";

export function isAuthClientConfigured() {
  return Boolean(supabase);
}

export function subscribeAuthStateChange(
  onChange: (event: string, session: unknown) => void,
) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange(event, session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithOAuth(
  params: OAuthSignInParams,
): Promise<ServiceResult<{ url: string | null }>> {
  if (!supabase) {
    return {
      data: { url: null },
      error: SUPABASE_UNAVAILABLE_ERROR,
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: params.provider as never,
    options: {
      redirectTo: params.redirectTo,
      skipBrowserRedirect: params.skipBrowserRedirect,
      queryParams: params.scope ? { scope: params.scope } : undefined,
    },
  });

  if (error) {
    return {
      data: { url: null },
      error: error.message,
    };
  }

  return {
    data: {
      url: data.url ?? null,
    },
    error: null,
  };
}

export async function signOutLocal(): Promise<ServiceResult<void>> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    return { data: undefined, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function loadUserAccess(
  userId: string,
): Promise<ServiceResult<{ isSystemAdmin: boolean; membershipCount: number }>> {
  if (!supabase) {
    return {
      data: { isSystemAdmin: false, membershipCount: 0 },
      error: SUPABASE_UNAVAILABLE_ERROR,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_system_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      data: { isSystemAdmin: false, membershipCount: 0 },
      error: profileError.message,
    };
  }

  if (profile?.is_system_admin) {
    return {
      data: { isSystemAdmin: true, membershipCount: 0 },
      error: null,
    };
  }

  const { count, error: countError } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    return {
      data: { isSystemAdmin: false, membershipCount: 0 },
      error: countError.message,
    };
  }

  return {
    data: {
      isSystemAdmin: false,
      membershipCount: count ?? 0,
    },
    error: null,
  };
}

export async function ensureCurrentAuthUserProfile(): Promise<
  ServiceResult<void>
> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { data: undefined, error: userError.message };
  }

  const user = userData.user;
  if (!user) {
    return { data: undefined, error: null };
  }

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return { data: undefined, error: existingError.message };
  }

  if (!existing) {
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    });

    if (upsertError) {
      return { data: undefined, error: upsertError.message };
    }
  }

  return { data: undefined, error: null };
}

export async function checkProfileExists(
  userId: string,
): Promise<ServiceResult<boolean>> {
  if (!supabase) {
    return { data: false, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: Boolean(data), error: null };
}

export async function registerTeamFromPending(
  payload: PendingRegistrationPayload,
): Promise<ServiceResult<void>> {
  if (!supabase) {
    return { data: undefined, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase.rpc("register_team", {
    p_name: payload.name,
    p_season_start: payload.seasonStart,
    p_holiday_start: payload.holidayStart,
    p_game_definitions: payload.gameDefinitions,
  });

  if (error) {
    return { data: undefined, error: error.message };
  }

  return { data: undefined, error: null };
}
