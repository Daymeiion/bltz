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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError || !data.user) {
        setError("This password reset link is invalid or has expired. Request a new link and try again.");
        return;
      }

      setIsRecoveryReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      if (password.length < 12) {
        throw new Error("Use at least 12 characters for your new password.");
      }
      if (password !== confirmation) {
        throw new Error("The passwords do not match.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/auth/login?password_reset=success");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password-confirmation">Confirm new password</Label>
                <Input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  required
                  minLength={12}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isRecoveryReady}
              >
                {isLoading
                  ? "Saving..."
                  : isRecoveryReady
                    ? "Save new password"
                    : "Checking reset link..."}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
