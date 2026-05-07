import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isTestAuthEnabled } from "@/lib/onboarding/test-auth";

export default function Page() {
  const testAuthEnabled = isTestAuthEnabled();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
              {testAuthEnabled ? (
                <a
                  href="/api/dev/test-auth?next=/onboarding"
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-bltz-gold px-4 text-sm font-semibold text-black hover:bg-yellow-400"
                >
                  Continue as test player
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
