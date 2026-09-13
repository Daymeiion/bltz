import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  invalid_credentials: "Unable to sign in with those credentials.",
  authentication_unavailable: "The sign-in service is temporarily unavailable. Please try again later.",
  authorization_unavailable: "Administrator access could not be verified right now. Please try again later.",
  rate_limited: "Too many sign-in attempts. Please wait before trying again.",
  not_admin: "This account does not have BLTZ administrator access.",
  profile_unavailable: "The administrator profile could not be verified.",
  missing_fields: "Email and password are required.",
  logout_unavailable: "This browser session was cleared, but server sign-out could not be confirmed. Please try signing in again when the service is available.",
};

export const metadata = {
  title: "Admin Sign In | BLTZ",
  description: "Private sign in for BLTZ internal administrators.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? errorMessages[error] ?? "Administrator sign in failed." : null;

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#05070b] px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label="Back to BLTZ home">
            <Image src="/bltz-white-logo.svg" alt="BLTZ" width={92} height={32} priority />
          </Link>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-[#ffbb00]" aria-hidden="true" />
            Internal access
          </span>
        </div>

        <Card className="border-neutral-800 bg-neutral-950 text-white shadow-2xl shadow-black/30">
          <CardHeader className="border-b border-neutral-800 pb-6">
            <CardTitle className="text-2xl">BLTZ Admin</CardTitle>
            <CardDescription className="text-neutral-400">
              Sign in with an approved administrator account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form action="/api/admin/login" method="post" className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  className="border-neutral-800 bg-black"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-neutral-500 hover:text-white">
                    Reset password
                  </Link>
                </div>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="border-neutral-800 bg-black"
                />
              </div>

              {message ? (
                <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {message}
                </p>
              ) : null}

              <Button type="submit" className="w-full bg-[#ffbb00] font-semibold text-black hover:bg-[#ffd052]">
                Sign in to Beta Intelligence
              </Button>
            </form>

            <p className="mt-5 text-center text-[11px] leading-5 text-neutral-600">
              Athlete and test-player accounts cannot access this surface.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
