import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { ReviewForm } from "@/components/onboarding/ReviewForm";
import type { PipelineDraft } from "@/lib/pipeline/types";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/onboarding");

  const { data: runRow } = await supabase
    .from("onboarding_pipeline_runs")
    .select("id, status, draft, identity")
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

  return (
    <div className="space-y-10">
      <StepIndicator current={3} />
      <header className="space-y-2 text-center">
        <h1 className="font-oswald text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          Review &amp; publish
        </h1>
        <p className="text-base text-white/70">
          Confirm what&apos;s yours. Edit anything that isn&apos;t. Then go live.
        </p>
      </header>

      <ReviewForm userId={user.id} runId={runRow.id} draft={draft} />
    </div>
  );
}
