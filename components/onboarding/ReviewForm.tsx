"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PipelineDraft, ScraperSource } from "@/lib/pipeline/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SlugInput } from "./SlugInput";
import { LockerInlinePreview } from "./LockerInlinePreview";
import { BroadcastPanel, SourceChip } from "./BroadcastShell";

interface Props {
  userId: string;
  runId: string;
  draft: PipelineDraft;
  initialSlug?: string;
  requiresVerification?: boolean;
}

interface FormState {
  full_name: string;
  bio: string;
  dob: string;
  height_in: string;
  weight_lbs: string;
  games_played: string;
  position: string;
  level: "hs" | "college" | "pro" | "former" | "";
  school: string;
  hometown: string;
  headshot_url: string;
  slug: string;
  /** Per-field confirmation flags. Numerics start unconfirmed when AI-derived. */
  confirmed: Partial<Record<string, boolean>>;
}

function defaultSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function ReviewForm({ userId, runId, draft, initialSlug, requiresVerification = false }: Props) {
  const router = useRouter();

  const [state, setState] = React.useState<FormState>(() => ({
    full_name: draft.full_name ?? "",
    bio: draft.bio ?? "",
    dob: draft.dob ?? "",
    height_in: draft.height_in != null ? String(draft.height_in) : "",
    weight_lbs: draft.weight_lbs != null ? String(draft.weight_lbs) : "",
    games_played: draft.games_played != null ? String(draft.games_played) : "",
    position: draft.position ?? "",
    level: (draft.level ?? "") as FormState["level"],
    school: draft.school ?? "",
    hometown: draft.hometown ?? "",
    headshot_url: draft.photos?.[0]?.url ?? "",
    slug: initialSlug ?? defaultSlug(draft.full_name ?? ""),
    confirmed: { ...(draft.confirmed ?? {}) },
  }));

  const [slugAvailable, setSlugAvailable] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
    if (requiresVerification) {
      setErr("Identity verification is required before this claimed locker can publish. Provider integration is the next security slice.");
      return;
    }
    if (!state.full_name.trim()) {
      setErr("Add your name before publishing.");
      return;
    }
    if (!state.slug || !slugAvailable) {
      setErr("Pick an available locker URL.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/onboarding/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          full_name: state.full_name.trim(),
          bio: state.bio.trim(),
          dob: state.dob || null,
          height_in: state.height_in ? Number(state.height_in) : null,
          weight_lbs: state.weight_lbs ? Number(state.weight_lbs) : null,
          games_played: state.games_played ? Number(state.games_played) : null,
          position: state.position || null,
          level: state.level || null,
          school: state.school || null,
          hometown: state.hometown || null,
          headshot_url: state.headshot_url || null,
          // gsis_id is not editable in the Review form — it's set by the
          // pipeline when nflverse matches and is forwarded to publish so
          // the locker page can join the cached NFL roster data.
          gsis_id: draft.gsis_id ?? null,
          // cfb_team_id likewise carried through from the user's school
          // autocomplete selection so the locker can render team colors.
          cfb_team_id: draft.cfb_team_id ?? null,
          slug: state.slug,
          confirmed_fields: state.confirmed,
          awards: draft.awards,
          youtube_urls: draft.youtube_urls,
          photos: draft.photos,
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(body.error ?? "Publish failed.");
        setSubmitting(false);
        return;
      }
      const { slug, testMode } = (await r.json()) as { slug: string; testMode?: boolean };
      if (testMode) {
        router.push(`/onboarding?testPublished=1&slug=${encodeURIComponent(slug)}`);
        return;
      }
      router.push(`/onboarding/complete?slug=${encodeURIComponent(slug)}`);
    } catch {
      setErr("Network error — try again.");
      setSubmitting(false);
    }
  }

  const previewDraft = React.useMemo(
    () => ({
      full_name: state.full_name,
      bio: state.bio,
      position: state.position,
      level: state.level,
      school: state.school,
      hometown: state.hometown,
      height_in: state.height_in ? Number(state.height_in) : null,
      weight_lbs: state.weight_lbs ? Number(state.weight_lbs) : null,
      games_played: state.games_played ? Number(state.games_played) : null,
      dob: state.dob || null,
      headshot_url: state.headshot_url,
      awards: draft.awards,
      youtube_urls: draft.youtube_urls,
      photos: draft.photos,
    }),
    [state, draft],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Live preview rendered INLINE — no iframe, no fixed height.
          The hero + locker sections flow with the page so the user
          scrolls through the whole locker just like a visitor would.
          The publish-ready/private chip stays as a small floating
          status above the hero so the editor knows the visibility
          state of what they're about to ship. */}
      <div className="flex items-center justify-end gap-3">
        <SourceChip tone={requiresVerification ? "warn" : "success"}>
          {requiresVerification ? "Private" : "Publish-ready"}
        </SourceChip>
      </div>
      <LockerInlinePreview
        draft={previewDraft}
        onBioChange={(v) => update("bio", v)}
      />

      <div className="space-y-6">
        <div className="space-y-6">
          <Section title="Locker URL">
            <SlugInput
              value={state.slug}
              onChange={(v) => update("slug", v)}
              onAvailabilityChange={setSlugAvailable}
            />
          </Section>

          <Section title="Identity">
            <Field label="Full name">
              <Input
                value={state.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="h-12 rounded border-white/15 bg-black/40 text-white"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <Input
                  value={state.position}
                  onChange={(e) => update("position", e.target.value)}
                  placeholder="QB"
                  className="h-12 rounded border-white/15 bg-black/40 text-white"
                />
              </Field>
              <Field label="Level">
                <select
                  value={state.level}
                  onChange={(e) => update("level", e.target.value as FormState["level"])}
                  className="h-12 w-full rounded border border-white/15 bg-black/40 px-3 text-white"
                >
                  <option value="">Pick one</option>
                  <option value="hs">High school</option>
                  <option value="college">College</option>
                  <option value="pro">Pro</option>
                  <option value="former">Former pro</option>
                </select>
              </Field>
            </div>
            <Field label="School / club">
              <Input
                value={state.school}
                onChange={(e) => update("school", e.target.value)}
                className="h-12 rounded border-white/15 bg-black/40 text-white"
              />
            </Field>
            <Field label="Hometown">
              <Input
                value={state.hometown}
                onChange={(e) => update("hometown", e.target.value)}
                placeholder="Optional"
                className="h-12 rounded border-white/15 bg-black/40 text-white"
              />
            </Field>
          </Section>

          {draft.sources?.length ? (
            <Section title="Sources we pulled">
              <ul className="space-y-1 text-sm text-white/70">
                {draft.sources.map((s) => (
                  <li key={s.url} className="flex items-center gap-2">
                    <SourceChip>{labelFor(s.source)}</SourceChip>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-bltz-gold hover:underline"
                    >
                      {s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>

      {err ? (
        <p className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-white/10 bg-[#050711]/86 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 md:static md:m-0 md:flex-row md:items-center md:justify-end md:border-0 md:bg-transparent md:p-0">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/onboarding")}
          className="text-white/70"
        >
          Start over
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 rounded bg-[#2952FF] px-8 text-base font-bold text-white hover:bg-[#1f43d8]"
        >
          {submitting
            ? "Publishing..."
            : requiresVerification
              ? "Verify identity to publish"
              : "Publish my locker"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <BroadcastPanel className="space-y-3 p-5 md:p-6">
      <header className="border-b border-white/10 pb-3">
        <h2 className="font-oswald text-xl font-bold uppercase tracking-normal text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-white/60">{subtitle}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </BroadcastPanel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-xs uppercase tracking-[0.14em] text-white/58">{label}</Label>
      {children}
    </div>
  );
}

function labelFor(source: ScraperSource): string {
  switch (source) {
    case "wikipedia":
      return "Wikipedia";
    case "espn":
      return "ESPN";
    case "youtube":
      return "YouTube";
    case "college_roster":
      return "College roster";
    case "nfl_team":
      return "NFL team site";
    case "founder_archive":
      return "BLTZ archive";
  }
}
