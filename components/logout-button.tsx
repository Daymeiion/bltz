"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useId, useRef, useState, type ComponentProps } from "react";

type LogoutButtonProps = Pick<ComponentProps<typeof Button>, "children" | "className" | "variant" | "aria-label">;

export function LogoutButton({ children = "Logout", ...props }: LogoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const errorId = useId();

  const logout = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(false);
    try {
      // End this browser's session without signing out other devices.
      const { error: signOutError } = await createClient().auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      // Discard the in-memory router cache along with the cleared auth cookies.
      window.location.replace("/auth/login");
    } catch {
      setError(true);
      setPending(false);
      inFlight.current = false;
    }
  };

  return <>
    <Button {...props} type="button" onClick={logout} disabled={pending} aria-busy={pending}
      aria-describedby={error ? errorId : undefined}>
      {pending ? "Signing out…" : children}
    </Button>
    {error && <p id={errorId} role="alert" className="text-sm text-destructive">Sign out failed. Please try again.</p>}
  </>;
}
