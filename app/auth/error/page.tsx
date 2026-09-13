import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p role="alert" className="text-sm text-muted-foreground">
                {params.error === "verification_unavailable"
                  ? "The sign-in service is temporarily unavailable. Please try again later."
                  : "This sign-in link could not be verified. It may be invalid or expired."}
              </p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="/auth/forgot-password" className="underline">Request a new password-reset link</Link>
                <Link href="/auth/login" className="underline">Return to sign in</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
