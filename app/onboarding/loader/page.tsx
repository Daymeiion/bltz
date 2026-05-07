import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { MagicMomentLoader } from "@/components/onboarding/MagicMomentLoader";
import { getTestRun, getTestUser } from "@/lib/onboarding/test-auth";

export const dynamic = "force-dynamic";

export default async function OnboardingLoaderPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  if (!run) redirect("/onboarding");

  const testUser = await getTestUser();
  const testRun = testUser ? getTestRun(run) : null;
  if (testRun) {
    return (
      <div className="space-y-10">
        <StepIndicator current={2} />
        <MagicMomentLoader runId={testRun.id} />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/onboarding");

  const { data: runRow } = await supabase
    .from("onboarding_pipeline_runs")
    .select("id, status")
    .eq("id", run)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!runRow) redirect("/onboarding");

  return (
    <div className="space-y-10">
      <StepIndicator current={2} />
      <MagicMomentLoader runId={runRow.id} />
    </div>
  );
}
