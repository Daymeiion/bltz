"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const [success, setSuccess] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const verifiedUserId = useRef<string | null>(null);
  const verification = useRef<Promise<{ id: string; email?: string }> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    // Share initialization across Strict Mode effect replay: a failed callback
    // must not become valid just because its URL was scrubbed by the first run.
    verification.current ??= (async () => {
      const cleanPath = window.location.pathname;
      try {
        const supabase = createClient();
        // SSR's browser client already exchanges a PKCE code on initialization.
        // Check its result before trusting an older session left in the browser.
        const { error: initializationError } = await supabase.auth.initialize();
        const url = new URL(window.location.href);
        const fragment = new URLSearchParams(url.hash.slice(1));
        const callbackKeys = ["code", "token_hash", "access_token", "refresh_token", "error", "error_code", "error_description"];
        const unconsumedCallback = callbackKeys.some(key => url.searchParams.has(key) || fragment.has(key));
        if (initializationError || unconsumedCallback) throw new Error("unverified_callback");
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) throw new Error("unverified_session");
        return { id: data.user.id, email: data.user.email };
      } finally {
        // Never retain callback credentials or provider errors in this page's URL.
        window.history.replaceState(window.history.state, "", cleanPath);
      }
    })();
    void verification.current.then(user => {
      if (active) {
        verifiedUserId.current = user.id;
        setAccountEmail(user.email ?? null);
        setSessionState("ready");
      }
    }).catch(() => { if (active) setSessionState("invalid"); });
    return () => { active = false; };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current || sessionState !== "ready" || success) return;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !session.user || session.user.id !== verifiedUserId.current) {
        setPassword("");
        setSessionState("invalid");
        return;
      }
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError || !data.user) {
        if (updateError?.status === 401 || updateError?.code === "session_not_found") {
          setPassword("");
          setSessionState("invalid");
          return;
        }
        setError(updateError?.code === "weak_password"
          ? "Choose a stronger password and try again."
          : updateError?.code === "same_password"
            ? "Choose a different password."
            : "Could not update your password. Please try again or request a new reset link.");
        return;
      }
      setPassword("");
      setSuccess(true);
    } catch {
      setError("Could not update your password. Please try again or request a new reset link.");
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            {success ? "Your password has been updated." : "Verify your session, then enter a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col gap-3 text-sm">
              <p role="status">Password updated. You can now sign in with your new password.</p>
              <Link href="/auth/login" className="underline">Continue to sign in</Link>
              <Link href="/auth/admin" className="underline">Administrator sign in</Link>
            </div>
          ) : sessionState === "checking" ? (
            <p role="status" className="text-sm">Verifying your session…</p>
          ) : sessionState === "invalid" ? (
            <div className="flex flex-col gap-3 text-sm">
              <p role="alert">Your session could not be verified. Open a fresh password-reset link in the browser where you requested it.</p>
              <Link href="/auth/forgot-password" className="underline">Request a new password-reset link</Link>
            </div>
          ) : <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <p className="text-sm text-muted-foreground">
                Updating password for {accountEmail ?? "your verified signed-in account"}.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading} aria-busy={isLoading}>
                {isLoading ? "Saving..." : "Save new password"}
              </Button>
            </div>
          </form>}
        </CardContent>
      </Card>
    </div>
  );
}
