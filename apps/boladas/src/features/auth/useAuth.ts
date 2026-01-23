import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";

export function useAuth() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const processingRegistration = useRef(false);

  // Handle post-login access check
  const handlePostLogin = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      // Check for pending registration (For PWA Redirect Flow)
      const registrationData = localStorage.getItem(
        "boladas:registration_data",
      );

      // Prevent duplicate registration calls
      if (registrationData && !processingRegistration.current) {
        processingRegistration.current = true;
        try {
          const { name, seasonStart, holidayStart } =
            JSON.parse(registrationData);
          // Call RPC to register team
          const { error: rpcError } = await supabase.rpc("register_team", {
            p_name: name,
            p_season_start: seasonStart,
            p_holiday_start: holidayStart,
          });

          if (rpcError) throw rpcError;

          // Clear storage after success
          localStorage.removeItem("boladas:registration_data");
        } catch (err) {
          console.error("Registration failed:", err);
          setError("Failed to complete team registration.");
        } finally {
          processingRegistration.current = false;
        }
      }

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
        // Unauthorized
        setError("Access denied. You must be part of a team to login.");
        await signOut();
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
        void handlePostLogin(user.id);
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
        void handlePostLogin(user.id);
      } else if (event === "SIGNED_OUT") {
        setIsSystemAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [handlePostLogin]);

  // Sync profile
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUserId) return;
    const upsertProfile = async () => {
      const { data: userData } = await client.auth.getUser();
      const user = userData.user;
      if (!user) return;
      await client.from("profiles").upsert({
        id: user.id,
        email: user.email,
        display_name:
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      });
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
