"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SchoolCombobox } from "./SchoolCombobox";
import { cn } from "@/lib/utils";

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
    <form onSubmit={onSubmit} className="space-y-7" noValidate>
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
          className="h-12 border-white/15 bg-black/40 px-4 text-base text-white placeholder:text-white/40 focus-visible:border-bltz-gold"
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
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => {
            const active = p === position;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setPosition(p)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "border-bltz-gold bg-bltz-gold text-black"
                    : "border-white/15 bg-white/5 text-white/80 hover:border-white/40",
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEVELS.map((l) => {
            const active = l.value === level;
            return (
              <button
                type="button"
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={cn(
                  "rounded-md border px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "border-bltz-gold bg-bltz-gold text-black"
                    : "border-white/15 bg-white/5 text-white/80 hover:border-white/40",
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
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.form}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-6 border-t border-white/10 bg-black/60 px-6 py-4 backdrop-blur md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full bg-bltz-gold text-base font-bold tracking-wide text-black hover:bg-yellow-400 md:w-auto md:px-10"
        >
          {submitting ? "Starting…" : "Sweep my career →"}
        </Button>
      </div>
    </form>
  );
}
