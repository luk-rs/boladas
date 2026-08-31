import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../shared/api/supabase/client";
import type { ContextModel } from "../../shared/types/context";
import { REGISTRATION_STORAGE_KEY } from "./registrationStorage";
import {
  ensureCurrentAuthUserProfile,
  loadUserAccess,
} from "./services/auth.service";
import { debounce } from "../../shared/utils/debounce";

type AuthState = {
  isAuthed: boolean;
  sessionUserId: string | null;
  sessionEmail: string | null;
  isSystemAdmin: boolean;
  loading: boolean;
  error: string | null;
};

type AuthActions = {
  signOut: () => Promise<void>;
};

type AuthModel = ContextModel<AuthState, AuthActions>;

const AuthContext = createContext<AuthModel | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const isInviteFlow = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (window.location.pathname.startsWith("/join/")) return true;

    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("invite"));
  }, []);

  const checkAccess = useCallback(
    async (userId: string) => {
      const accessResult = await loadUserAccess(userId);
      if (accessResult.error) {
        setError(accessResult.error);
        setLoading(false);
        return;
      }

      if (accessResult.data.isSystemAdmin) {
        setIsSystemAdmin(true);
        setLoading(false);
        return;
      }
      setIsSystemAdmin(false);

      if (accessResult.data.membershipCount === 0) {
        const pendingReg = localStorage.getItem(REGISTRATION_STORAGE_KEY);
        const pendingInvite = isInviteFlow();

        if (pendingReg || pendingInvite) {
          setLoading(false);
        } else {
          setError(
            "Acesso negado. Tens de pertencer a pelo menos uma equipa para iniciar sessão.",
          );
          await signOut();
        }
      } else {
        setLoading(false);
      }
    },
    [isInviteFlow, signOut],
  );

  const checkAccessDebounced = useMemo(
    () =>
      debounce((userId: string) => {
        void checkAccess(userId);
      }, 500),
    [checkAccess],
  );

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setSessionEmail(user?.email ?? null);
      setSessionUserId(user?.id ?? null);
      if (user?.id) {
        checkAccessDebounced(user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      setSessionEmail(user?.email ?? null);
      setSessionUserId(user?.id ?? null);

      if (event === "SIGNED_IN" && user?.id) {
        setLoading(true);
        checkAccessDebounced(user.id);
      } else if (event === "SIGNED_OUT") {
        setIsSystemAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [checkAccessDebounced]);

  useEffect(() => {
    if (!sessionUserId) return;

    const key = `profile_ensured_${sessionUserId}`;
    if (localStorage.getItem(key) === "true") return;

    const upsertProfile = async () => {
      const result = await ensureCurrentAuthUserProfile();
      if (result.error) {
        console.error("Falha ao garantir perfil do utilizador:", result.error);
      } else {
        localStorage.setItem(key, "true");
      }
    };

    void upsertProfile();
  }, [sessionUserId]);

  const value = useMemo<AuthModel>(
    () => ({
      state: {
        isAuthed: Boolean(sessionUserId),
        sessionUserId,
        sessionEmail,
        isSystemAdmin,
        loading,
        error,
      },
      actions: {
        signOut,
      },
    }),
    [sessionUserId, sessionEmail, isSystemAdmin, loading, error, signOut],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext tem de ser usado dentro de AuthProvider.");
  }
  return context;
}

export function useAuth() {
  const { state, actions } = useAuthContext();
  return {
    ...state,
    ...actions,
  };
}
