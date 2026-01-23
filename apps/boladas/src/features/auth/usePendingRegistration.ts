import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./useAuth";

const REGISTRATION_KEY = "boladas:registration_data";

export function usePendingRegistration() {
  const { sessionUserId, signOut } = useAuth();
  const processingRef = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Pre-checks: Must be logged in, not already processing, and have data
    if (!supabase || !sessionUserId || processingRef.current) return;

    const registrationDataStr = localStorage.getItem(REGISTRATION_KEY);
    if (!registrationDataStr) return;

    const executeRegistration = async () => {
      if (!supabase) return;
      processingRef.current = true;
      setStatus("processing");
      console.log(
        "🔍 Pending registration found. Verifying profile existence...",
      );

      try {
        // 2. Race Condition Fix: Wait/Check for Profile
        // We poll briefly to ensure the database trigger/upsert has finished creating the profile
        // This is safer than assuming it exists immediately after auth.
        let profileExists = false;
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", sessionUserId)
            .maybeSingle();

          if (data) {
            profileExists = true;
            break;
          }
          // Wait 500ms before retry
          await new Promise((r) => setTimeout(r, 500));
        }

        if (!profileExists) {
          throw new Error(
            "User profile could not be verified. Please try again.",
          );
        }

        // 3. Parse and Execute
        const { name, seasonStart, holidayStart, gameDefinitions } =
          JSON.parse(registrationDataStr);

        console.log("🚀 Executing Pending Registration:", { name });

        const { error: rpcError } = await supabase.rpc("register_team", {
          p_name: name,
          p_season_start: String(seasonStart),
          p_holiday_start: holidayStart ? String(holidayStart) : null,
          p_game_definitions: gameDefinitions || [],
        });

        if (rpcError) throw rpcError;

        // 4. Success
        console.log("✅ Registration successful!");
        localStorage.removeItem(REGISTRATION_KEY);
        setStatus("success");
        // Reload to refresh team list/UI state
        window.location.reload();
      } catch (err: any) {
        console.error("❌ Registration Failed:", err);
        setError(err.message || "Registration failed.");
        setStatus("error");

        // Critical Failure: Rollback
        // specific error handling could go here (e.g. only rollback on 409 or 500)
        // for now, we rollback to avoid loops
        localStorage.removeItem(REGISTRATION_KEY);
        await signOut();
      } finally {
        processingRef.current = false;
      }
    };

    executeRegistration();
  }, [sessionUserId, signOut]);

  return { status, error };
}
