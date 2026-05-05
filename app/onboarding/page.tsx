import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { IdentityForm } from "@/components/onboarding/IdentityForm";

export const dynamic = "force-dynamic";

export default async function OnboardingStartPage() {
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

  return (
    <div className="space-y-10">
      <StepIndicator current={1} />
      <header className="space-y-3 text-center">
        <h1 className="font-oswald text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
          Claim your locker
        </h1>
        <p className="text-base text-white/70 md:text-lg">
          Tell us who suits up. We&apos;ll sweep public sources for your tape, awards,
          and headshots — you confirm what stays.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
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
