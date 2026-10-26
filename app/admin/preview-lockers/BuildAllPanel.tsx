"use client";
import { Button } from "@/components/ui/button";
import { buildSearchKeys, type BuildProgress, type BuildStep } from "@/lib/preview-lockers/build-client";

export const buildStepLabels: Record<BuildStep, string> = {
  career: "Career details & media", save: "Private draft save", news: "Awards & news", merchandise: "Merchandise", combine: "Combine",
};
const stateLabels: Record<BuildProgress["state"], string> = {
  waiting: "Waiting", running: "Running", complete: "Complete", partial: "Partial", failed: "Needs attention", cancelled: "Cancelled",
};
export default function BuildAllPanel({ steps, busy, disabled, canRetry, onBuild, onRetry, onCancel }: {
  steps: Partial<Record<BuildStep, BuildProgress>>; busy: boolean; disabled: boolean; canRetry: boolean;
  onBuild: () => void; onRetry: () => void; onCancel: () => void;
}) {
  const hasRetry = buildSearchKeys.some(key => ["partial", "failed", "cancelled"].includes(steps[key]?.state ?? ""));
  return <section aria-label="Build and search all" className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">Build & search all</h2>
    <p className="text-sm">Gather career details, save private draft progress, then search news, merchandise and Combine together. Existing stats, measurements, uploads and edits stay intact. Review results in their tabs before adding them.</p>
    <p className="text-xs text-muted-foreground">Your current edits and new career suggestions are saved privately. Existing invite links or assigned viewers can see saved updates. Review new articles, products and measurements before adding them.</p>
    <div className="flex flex-wrap gap-3">
      <Button type="button" disabled={disabled} onClick={onBuild}>{busy ? "Building & searching…" : "Build & search all"}</Button>
      {busy && <Button type="button" variant="outline" onClick={onCancel}>Cancel remaining work</Button>}
      {!busy && hasRetry && <Button type="button" variant="outline" disabled={!canRetry} onClick={onRetry}>Retry unfinished searches</Button>}
    </div>
    {hasRetry && !busy && !canRetry && <p className="text-xs text-muted-foreground">Save your draft edits before retrying searches. If the saved version changed, open the latest version first.</p>}
    {!!Object.keys(steps).length && <ol aria-label="Scraper progress" aria-live="polite" className="space-y-2">
      {(Object.keys(buildStepLabels) as BuildStep[]).map(key => steps[key] && <li key={key} className="min-w-0 border-t pt-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{buildStepLabels[key]}</strong><span>{stateLabels[steps[key]!.state]}</span></div>
        <p className="break-words text-xs text-muted-foreground">{steps[key]!.message}</p>
      </li>)}
    </ol>}
    <p className="text-xs text-muted-foreground">News and merchandise reviews are saved separately. Pending Combine suggestions stay in this open editor; add reviewed measurements and save to keep them. CSV imports remain manual.</p>
  </section>;
}
