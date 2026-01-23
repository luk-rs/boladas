import { SignIn } from "../SignIn";
import { useAuth } from "../useAuth";
import { useMemo } from "react";

export function LoginPage() {
  const { error } = useAuth();

  // Invite Token Logic (handling existing invite param)
  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("invite");
  }, []);

  return <SignIn inviteToken={inviteToken} error={error} />;
}
