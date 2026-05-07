"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SchoolCombobox } from "./SchoolCombobox";
import { cn } from "@/lib/utils";
import { BroadcastPanel, SourceChip } from "./BroadcastShell";

const POSITIONS = [
  "QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P", "ATH",
];

const LEVELS: { value: "hs" | "college" | "pro" | "former"; label: string }[] = [
  { value: "hs", label: "High school" },
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
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/42">
              Scout card
            </p>
            <h2 className="mt-1 font-oswald text-2xl font-bold uppercase text-white">
              Start the sweep
            </h2>
          </div>
          <SourceChip tone="gold">Step 01</SourceChip>
        </div>

        <div className="space-y-7">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm uppercase tracking-wider text-white/70">
              Full name
            </Label>
            <Input
              id="fullName"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jordan Carter"
              className="h-14 rounded border-white/15 bg-black/40 px-4 text-base text-white placeholder:text-white/40 focus-visible:border-[#F5A623]"
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName ? (
              <p className="text-sm text-red-400">{errors.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm uppercase tracking-wider text-white/70">
              School or club
            </Label>
            <SchoolCombobox value={school} onChange={setSchool} />
            {errors.school ? (
              <p className="text-sm text-red-400">{errors.school}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm uppercase tracking-wider text-white/70">
              Position
            </Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {POSITIONS.map((p) => {
                const active = p === position;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPosition(p)}
                    className={cn(
                      "min-h-11 border px-3 py-2 font-mono text-sm font-semibold uppercase transition",
                      active
                        ? "border-[#F5A623] bg-[#F5A623] text-black"
                        : "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/40",
                    )}
                    aria-pressed={active}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {errors.position ? (
              <p className="text-sm text-red-400">{errors.position}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-sm uppercase tracking-wider text-white/70">
              Level
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((l) => {
                const active = l.value === level;
                return (
                  <button
                    type="button"
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={cn(
                      "min-h-12 border px-3 py-3 text-sm font-semibold transition",
                      active
                        ? "border-[#F5A623] bg-[#F5A623] text-black"
                        : "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/40",
                    )}
                    aria-pressed={active}
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
            <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errors.form}
            </p>
          ) : null}

          <div className="sticky bottom-0 -mx-5 border-t border-white/10 bg-[#050711]/86 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded bg-[#2952FF] text-base font-bold tracking-wide text-white hover:bg-[#1f43d8] md:px-10"
            >
              {submitting ? "Searching..." : "Search my career"}
            </Button>
          </div>
        </div>
      </BroadcastPanel>
    </form>
  );
}
