import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "./useAuth";
import {
  REGISTRATION_ERROR_KEY,
  REGISTRATION_LOCK_KEY,
  REGISTRATION_STORAGE_KEY,
} from "./registrationStorage";

function toRegistrationErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message) {
      if (/at least one valid game definition/i.test(message)) {
        return "Defina pelo menos um horário de jogo válido.";
      }
      return message;
    }
  }
  return "Não foi possível concluir o registo do time.";
}

function isDuplicateTeamCreationError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const payload = err as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const code = String(payload.code ?? "");
  const text = `${String(payload.message ?? "")} ${String(payload.details ?? "")} ${String(payload.hint ?? "")}`;
  return code === "23505" && /teams_created_by_name_key/i.test(text);
}

export function usePendingRegistration() {
  const { sessionUserId } = useAuth();
  const processingRef = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Pre-checks: Must be logged in, not already processing, and have data
    if (!supabase || !sessionUserId || processingRef.current) return;

    // Invite onboarding should never trigger pending registration side effects.
    const isInviteFlow =
      window.location.pathname.startsWith("/join/") ||
      new URLSearchParams(window.location.search).has("invite");
    if (isInviteFlow) return;

    const registrationDataStr = localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!registrationDataStr) {
      localStorage.removeItem(REGISTRATION_LOCK_KEY);
      return;
    }

    // Prevent duplicate executions across StrictMode remounts / rapid re-renders.
    if (localStorage.getItem(REGISTRATION_LOCK_KEY) === "1") {
      return;
    }
    localStorage.setItem(REGISTRATION_LOCK_KEY, "1");

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
        localStorage.removeItem(REGISTRATION_STORAGE_KEY);
        localStorage.removeItem(REGISTRATION_ERROR_KEY);
        localStorage.removeItem(REGISTRATION_LOCK_KEY);
        setStatus("success");
        // Reload to refresh team list/UI state
        window.location.reload();
      } catch (err: any) {
        if (isDuplicateTeamCreationError(err)) {
          // Idempotent success path: a duplicate submission can happen due
          // OAuth callback timing / remounts. Team is already created.
          localStorage.removeItem(REGISTRATION_STORAGE_KEY);
          localStorage.removeItem(REGISTRATION_ERROR_KEY);
          localStorage.removeItem(REGISTRATION_LOCK_KEY);
          setStatus("success");
          window.location.reload();
          return;
        }

        const message = toRegistrationErrorMessage(err);
        console.error("❌ Registration Failed:", err);
        setError(message);
        setStatus("error");

        // Avoid retry loops and force user back to registration screen.
        localStorage.removeItem(REGISTRATION_STORAGE_KEY);
        localStorage.setItem(REGISTRATION_ERROR_KEY, message);
        localStorage.removeItem(REGISTRATION_LOCK_KEY);
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (signOutError) {
          console.error("❌ Failed to sign out after registration error:", signOutError);
        }

        const loginUrl = new URL(`${window.location.origin}/login`);
        loginUrl.searchParams.set("register", "1");
        window.location.assign(loginUrl.toString());
      } finally {
        processingRef.current = false;
        localStorage.removeItem(REGISTRATION_LOCK_KEY);
      }
    };

    executeRegistration();
  }, [sessionUserId]);

  return { status, error };
}
