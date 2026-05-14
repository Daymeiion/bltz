"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SchoolCombobox } from "./SchoolCombobox";
import { cn } from "@/lib/utils";
import { BroadcastPanel } from "./BroadcastShell";
import { PositionField } from "./PositionField";

// Level switch options. "High school" was removed from the user-facing
// picker — those athletes go through a different funnel today; keeping
// the type wide for future expansion / claim-link pre-fills.
const LEVELS: { value: "college" | "pro" | "former"; label: string }[] = [
  { value: "college", label: "College" },
  { value: "pro", label: "Pro" },
  { value: "former", label: "Former pro" },
];

interface FieldErrors {
  fullName?: string;
  school?: string;
  position?: string;
  level?: string;
  form?: string;
}

export function IdentityForm() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [school, setSchool] = React.useState("");
  // ESPN team ID captured when the user picks a school from the
  // logo-rich autocomplete. Stays null when the athlete free-types a
  // program ESPN doesn't track (high school, club, non-D1 college).
  // Forwarded to the pipeline so the locker page can render team
  // colors and logo automatically without a separate scrape pass.
  const [cfbTeamId, setCfbTeamId] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState("");
  const [level, setLevel] = React.useState<"hs" | "college" | "pro" | "former" | "">("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (fullName.trim().length < 2) e.fullName = "Tell us your name.";
    if (!school.trim()) e.school = "Add the school or club you suit up for.";
    if (!position) e.position = "Pick a position.";
    if (!level) e.level = "What's your level right now?";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const r = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          school: school.trim(),
          // Only sent when the user actually picked a school from the
          // logo-rich autocomplete. Free-typed entries leave this null.
          cfb_team_id: cfbTeamId,
          position,
          level,
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setErrors({ form: body.error ?? "Something fumbled. Try again." });
        setSubmitting(false);
        return;
      }
      const { runId } = (await r.json()) as { runId: string };
      router.push(`/onboarding/loader?run=${encodeURIComponent(runId)}`);
    } catch {
      setErrors({ form: "Couldn't reach our pipeline. Try again." });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl" noValidate>
      <BroadcastPanel tone="strong" className="p-5 sm:p-6">
        {/* Title block removed — the new step indicator and the page-level
            BroadcastHeader ("Verify the basics") already establish where
            the athlete is in the flow. Having "Scout card / Start the
            sweep / Step 01" inside the form was redundant copy. */}
        <div className="space-y-7">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="block text-center text-base uppercase tracking-wider text-white">
              Full name
            </Label>
            <Input
              id="fullName"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordan Carter"
              className="h-14 rounded-md border-white/15 bg-black/40 px-4 text-base text-white placeholder:text-white/40 focus-visible:border-[#F5A623]"
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? (
              <p className="text-sm text-red-400">{errors.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="block text-center text-base uppercase tracking-wider text-white">
              School or club
            </Label>
            <SchoolCombobox
              value={school}
              onChange={(v, meta) => {
                setSchool(v);
                setCfbTeamId(meta?.cfb_team_id ?? null);
              }}
            />
            {errors.school ? (
              <p className="text-sm text-red-400">{errors.school}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="block text-center text-base uppercase tracking-wider text-white">
              Position
            </Label>
            <PositionField value={position} onChange={setPosition} />
            {errors.position ? (
              <p className="text-sm text-red-400">{errors.position}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="block text-center text-base uppercase tracking-wider text-white">
              Level
            </Label>
            {/* 3-option animated switch — same segmented-control pattern
                as the position Offense/Defense switch. The gold thumb
                slides between segments based on selection; the active
                segment text inverts to dark on gold. */}
            <div
              role="radiogroup"
              aria-label="Level"
              className="relative mx-auto flex w-full max-w-md rounded-full border border-white/15 bg-black/30 p-1"
            >
              {/* Sliding thumb: 1/3 width, translates 0% / 100% / 200%
                  depending on which segment is active. Hidden when no
                  level is picked yet so the switch reads as "empty". */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-1 left-1 z-0 rounded-full bg-bltz-gold shadow-[0_4px_14px_rgba(245,166,35,0.55)]",
                  "transition-all duration-300 ease-out",
                  level ? "opacity-100" : "opacity-0",
                )}
                style={{
                  width: "calc((100% - 0.5rem) / 3)",
                  transform: `translateX(${
                    level === "pro"
                      ? "100%"
                      : level === "former"
                        ? "200%"
                        : "0%"
                  })`,
                }}
              />
              {LEVELS.map((l) => {
                const active = l.value === level;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={cn(
                      "relative z-10 flex-1 rounded-full px-3 py-2.5",
                      "font-oswald text-sm font-bold uppercase tracking-wider",
                      "transition-colors duration-200",
                      active ? "text-black" : "text-white/55 hover:text-white/85",
                    )}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            {errors.level ? (
              <p className="text-sm text-red-400">{errors.level}</p>
            ) : null}
          </div>

          {errors.form ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errors.form}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-5 border-t border-white/10 bg-[#050711]/86 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
            {/* Centered submit. 80% width on phones (still tap-friendly
                while leaving margin), narrows to 1/3 on lg+ so it reads
                as a deliberate CTA rather than a full-width form bar. */}
            <Button
              type="submit"
              disabled={submitting}
              className="mx-auto block h-12 w-4/5 rounded-md bg-bltz-gold text-base font-bold uppercase tracking-wide text-black hover:bg-bltz-gold/85 disabled:opacity-50 md:w-1/2 lg:w-1/3"
            >
              {submitting ? "Searching..." : "Search my career"}
            </Button>
          </div>
        </div>
      </BroadcastPanel>
    </form>
  );
}
