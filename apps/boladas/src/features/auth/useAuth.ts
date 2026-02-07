import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";

type AuthContextValue = {
  isAuthed: boolean;
  sessionUserId: string | null;
  sessionEmail: string | null;
  isSystemAdmin: boolean;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuthState(): AuthContextValue {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  // Handle post-login access check
  const checkAccess = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      // Access Check: Must be System Admin OR belong to a team
      // 1. Check System Admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_system_admin")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.is_system_admin) {
        setIsSystemAdmin(true);
        setLoading(false);
        return; // Success
      }

      // 2. Check Team Membership
      const { count, error: countError } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        setError(countError.message);
        setLoading(false);
        return;
      }

      if (count === 0) {
        // Strict Mode Logic:
        // Users MUST have a team.
        // Exception: They are currently in the middle of a registration flow (Pending Registration).
        const pendingReg = localStorage.getItem("boladas:registration_data");

        if (pendingReg) {
          // Allow temporary access to complete registration
          setLoading(false);
        } else {
          // Unauthorized: No team and no pending registration
          console.warn(
            "⛔ Access Denied: User has no teams and no pending registration.",
          );
          setError("Access denied. You must be part of a team to login.");
          await signOut();
        }
      } else {
        // Success
        setLoading(false);
      }
    },
    [signOut],
  );

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    // Initial session check
    client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setSessionEmail(user?.email ?? null);
      setSessionUserId(user?.id ?? null);
      if (user?.id) {
        void checkAccess(user.id);
      } else {
        setLoading(false);
      }
    });

    // Auth state listener
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      setSessionEmail(user?.email ?? null);
      setSessionUserId(user?.id ?? null);

      if (event === "SIGNED_IN" && user?.id) {
        setLoading(true); // Set loading while we verify
        void checkAccess(user.id);
      } else if (event === "SIGNED_OUT") {
        setIsSystemAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [checkAccess]);

  // Sync profile (only if it doesn't exist)
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    const upsertProfile = async () => {
      const { data: userData } = await client.auth.getUser();
      const user = userData.user;
      if (!user) return;

      // Check if profile exists first
      const { data: existing } = await client
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // Only upsert if profile doesn't exist
      if (!existing) {
        await client.from("profiles").upsert({
          id: user.id,
          email: user.email,
          display_name:
            user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        });
      }
    };
    void upsertProfile();
  }, [sessionUserId]);

  return {
    isAuthed: Boolean(sessionUserId),
    sessionUserId,
    sessionEmail,
    isSystemAdmin,
    loading,
    error,
    signOut,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
