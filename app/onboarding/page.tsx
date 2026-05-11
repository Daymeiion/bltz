import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { IdentityForm } from "@/components/onboarding/IdentityForm";
import { getTestUser } from "@/lib/onboarding/test-auth";
import { BroadcastHeader } from "@/components/onboarding/BroadcastShell";

export const dynamic = "force-dynamic";

export default async function OnboardingStartPage({
  searchParams,
}: {
  searchParams: Promise<{ testPublished?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const testUser = await getTestUser();
  if (testUser) {
    return <OnboardingStartContent testPublished={params.testPublished === "1"} slug={params.slug} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, player_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.player_id) redirect("/dashboard");

  return <OnboardingStartContent />;
}

function OnboardingStartContent({
  testPublished = false,
  slug,
}: {
  testPublished?: boolean;
  slug?: string;
}) {
  return (
    <div className="space-y-8">
      {testPublished ? (
        <div className="border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Test publish completed for <span className="font-semibold">{slug}</span>. No
          Supabase player row was created.
        </div>
      ) : null}
      <StepIndicator current={1} />

      <div className="mx-auto max-w-3xl">
        <BroadcastHeader
          title={
            <>
              Verify the basics
            </>
          }
          align="center"
        />
      </div>

      <section>
        <IdentityForm />
      </section>

      <p className="text-center text-xs text-white/40">
        Already have a locker draft?{" "}
        <a className="text-white/70 underline-offset-4 hover:underline" href="/auth/login">
          Sign in to continue
        </a>
        .
      </p>
    </div>
  );
}
