import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export function useAuth() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    // Initial session check
    client.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null);
      setSessionUserId(data.session?.user?.id ?? null);
      setLoading(false);
    });

    // Auth state listener
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
      setSessionUserId(session?.user?.id ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

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

  // Check system admin
  useEffect(() => {
    const client = supabase;
    if (!client || !sessionUserId) {
      setIsSystemAdmin(false);
      return;
    }
    const loadProfile = async () => {
      const { data, error: profileError } = await client
        .from("profiles")
        .select("is_system_admin")
        .eq("id", sessionUserId)
        .maybeSingle();
      if (profileError) {
        setError(profileError.message);
        return;
      }
      setIsSystemAdmin(Boolean(data?.is_system_admin));
    };
    void loadProfile();
  }, [sessionUserId]);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

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
