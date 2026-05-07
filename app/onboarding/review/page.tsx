import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { ReviewForm } from "@/components/onboarding/ReviewForm";
import type { PipelineDraft } from "@/lib/pipeline/types";
import { TEST_USER_ID, getTestRun, getTestUser } from "@/lib/onboarding/test-auth";

export const dynamic = "force-dynamic";

const EMPTY_DRAFT: PipelineDraft = {
  full_name: "",
  bio: "",
  awards: [],
  youtube_urls: [],
  photos: [],
  confirmed: {},
  sources: [],
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  if (!run) redirect("/onboarding");

  const testUser = await getTestUser();
  const testRun = testUser ? getTestRun(run) : null;
  if (testRun) {
    const draft: PipelineDraft = {
      ...EMPTY_DRAFT,
      ...testRun.draft,
      full_name: testRun.identity.full_name ?? "",
      school: testRun.identity.school ?? null,
      position: testRun.identity.position ?? null,
      level: testRun.identity.level ?? null,
    };

    return <ReviewContent userId={TEST_USER_ID} runId={testRun.id} draft={draft} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/onboarding");

  const { data: runRow } = await supabase
    .from("onboarding_pipeline_runs")
    .select("id, status, draft, identity, claim_token")
    .eq("id", run)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!runRow) redirect("/onboarding");

  const identity = (runRow.identity ?? {}) as { full_name?: string; school?: string; position?: string; level?: PipelineDraft["level"] };
  const draft: PipelineDraft = {
    ...EMPTY_DRAFT,
    full_name: identity.full_name ?? "",
    school: identity.school ?? null,
    position: identity.position ?? null,
    level: identity.level ?? null,
    ...((runRow.draft ?? {}) as Partial<PipelineDraft>),
  };

  return <ReviewContent userId={user.id} runId={runRow.id} draft={draft} requiresVerification={Boolean(runRow.claim_token)} />;
}

function ReviewContent({
  userId,
  runId,
  draft,
  requiresVerification = false,
}: {
  userId: string;
  runId: string;
  draft: PipelineDraft;
  requiresVerification?: boolean;
}) {
  return (
    <div className="space-y-10">
      <StepIndicator current={3} />
      <header className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">
            Review desk
          </p>
          <h1 className="mt-3 font-oswald text-4xl font-bold uppercase leading-[0.95] tracking-normal text-white md:text-5xl">
            Confirm your <span className="text-[#F5A623]">career</span>
          </h1>
        </div>
        <p className="max-w-2xl text-base leading-7 text-white/68">
          Edit every line, inspect sources, and sign off on the facts. Claimed lockers
          remain private until identity verification clears.
        </p>
      </header>

      <ReviewForm userId={userId} runId={runId} draft={draft} requiresVerification={requiresVerification} />
    </div>
  );
}
