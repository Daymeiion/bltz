"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PipelineDraft, ScraperSource } from "@/lib/pipeline/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HeadshotUploader } from "./HeadshotUploader";
import { SlugInput } from "./SlugInput";
import { LivePreviewIframe } from "./LivePreviewIframe";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  runId: string;
  draft: PipelineDraft;
  initialSlug?: string;
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

export function ReviewForm({ userId, runId, draft, initialSlug }: Props) {
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

  function toggleConfirm(field: string) {
    setState((s) => ({
      ...s,
      confirmed: { ...s.confirmed, [field]: !s.confirmed[field] },
    }));
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
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
      const { slug } = (await r.json()) as { slug: string };
      router.push(`/dashboard?welcome=1&slug=${encodeURIComponent(slug)}`);
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
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-7">
          <Section title="Headshot">
            <HeadshotUploader
              userId={userId}
              initialUrl={state.headshot_url}
              onUploaded={(url) => update("headshot_url", url)}
            />
          </Section>

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
                className="border-white/15 bg-black/40 text-white"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <Input
                  value={state.position}
                  onChange={(e) => update("position", e.target.value)}
                  placeholder="QB"
                  className="border-white/15 bg-black/40 text-white"
                />
              </Field>
              <Field label="Level">
                <select
                  value={state.level}
                  onChange={(e) => update("level", e.target.value as FormState["level"])}
                  className="h-9 w-full rounded-md border border-white/15 bg-black/40 px-3 text-white"
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
                className="border-white/15 bg-black/40 text-white"
              />
            </Field>
            <Field label="Hometown">
              <Input
                value={state.hometown}
                onChange={(e) => update("hometown", e.target.value)}
                placeholder="Optional"
                className="border-white/15 bg-black/40 text-white"
              />
            </Field>
          </Section>

          <Section
            title="Stats"
            subtitle="We pulled these from public sources — confirm or edit each row."
          >
            <ConfirmRow
              label="Date of birth"
              fieldKey="dob"
              confirmed={!!state.confirmed.dob}
              onToggle={() => toggleConfirm("dob")}
            >
              <Input
                type="date"
                value={state.dob}
                onChange={(e) => update("dob", e.target.value)}
                className="border-white/15 bg-black/40 text-white"
              />
            </ConfirmRow>
            <ConfirmRow
              label="Height (in)"
              fieldKey="height_in"
              confirmed={!!state.confirmed.height_in}
              onToggle={() => toggleConfirm("height_in")}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={state.height_in}
                onChange={(e) => update("height_in", e.target.value)}
                className="border-white/15 bg-black/40 text-white"
              />
            </ConfirmRow>
            <ConfirmRow
              label="Weight (lbs)"
              fieldKey="weight_lbs"
              confirmed={!!state.confirmed.weight_lbs}
              onToggle={() => toggleConfirm("weight_lbs")}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={state.weight_lbs}
                onChange={(e) => update("weight_lbs", e.target.value)}
                className="border-white/15 bg-black/40 text-white"
              />
            </ConfirmRow>
            <ConfirmRow
              label="Games played"
              fieldKey="games_played"
              confirmed={!!state.confirmed.games_played}
              onToggle={() => toggleConfirm("games_played")}
            >
              <Input
                type="number"
                inputMode="numeric"
                value={state.games_played}
                onChange={(e) => update("games_played", e.target.value)}
                className="border-white/15 bg-black/40 text-white"
              />
            </ConfirmRow>
          </Section>

          <Section title="Story">
            <Textarea
              value={state.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={6}
              className="border-white/15 bg-black/40 text-white"
              placeholder="Your career in your voice."
            />
            <p className="text-xs text-white/40">
              {state.bio.length} characters
            </p>
          </Section>

          {draft.sources?.length ? (
            <Section title="Sources we pulled">
              <ul className="space-y-1 text-sm text-white/70">
                {draft.sources.map((s) => (
                  <li key={s.url} className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wider">
                      {labelFor(s.source)}
                    </span>
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

        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-xs uppercase tracking-widest text-white/50">
            Live preview
          </p>
          <LivePreviewIframe slug={state.slug || "__preview__"} draft={previewDraft} />
        </div>
      </div>

      {err ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-6 flex flex-col-reverse gap-3 border-t border-white/10 bg-black/70 px-6 py-4 backdrop-blur md:static md:m-0 md:flex-row md:items-center md:justify-end md:border-0 md:bg-transparent md:p-0">
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
          className="h-12 bg-bltz-gold px-8 text-base font-bold text-black hover:bg-yellow-400"
        >
          {submitting ? "Publishing…" : "Publish my locker"}
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
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <header>
        <h2 className="font-oswald text-lg font-bold uppercase tracking-tight text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-white/60">{subtitle}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-white/60">{label}</Label>
      {children}
    </div>
  );
}

function ConfirmRow({
  label,
  confirmed,
  fieldKey,
  onToggle,
  children,
}: {
  label: string;
  fieldKey: string;
  confirmed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-white/60">{label}</Label>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
            confirmed
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-yellow-500/15 text-yellow-300",
          )}
          aria-pressed={confirmed}
        >
          {confirmed ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" /> Confirmed
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" /> Unconfirmed
            </>
          )}
        </button>
      </div>
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
