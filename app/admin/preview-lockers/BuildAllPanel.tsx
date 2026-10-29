"use client";

import { Button } from "@/components/ui/button";
import { buildTaskLabels, buildTasks, type BuildStatus, type BuildTask } from "@/lib/preview-lockers/build-all";
import styles from "./preview-form.module.css";

const stateLabels = { waiting: "Waiting", running: "Running", done: "Done", failed: "Failed", skipped: "Skipped" } as const;
const reviewTab: Partial<Record<BuildTask, { tab: string; label: string }>> = {
  awards: { tab: "career", label: "Review in Career" },
  news: { tab: "media", label: "Review in Media" },
  merchandise: { tab: "media", label: "Review in Media" },
  combine: { tab: "stats", label: "Review in Stats" },
};

export default function BuildAllPanel({ status, running, canStart, canRetry, onStart, onCancel, onRetry, onReview }: {
  status: BuildStatus | null; running: boolean; canStart: boolean; canRetry: boolean;
  onStart: () => void; onCancel: () => void; onRetry: () => void; onReview: (tab: string) => void;
}) {
  return <section className="space-y-3 rounded-lg border p-4" aria-labelledby="preview-build-all-heading">
    <div className="space-y-1">
      <h2 id="preview-build-all-heading" className="font-semibold">Build & search all</h2>
      <p className="text-sm">One click runs the career search, saves a private draft, then searches awards, news, merchandise and Combine together. Results wait for your review; nothing is added to the Locker automatically.</p>
      <p className="text-sm text-muted-foreground">Saving makes changes visible to anyone already invited to this preview. Each full run uses four of your daily scraper searches.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      {running
        ? <Button type="button" variant="outline" onClick={onCancel}>Cancel remaining work</Button>
        : <Button type="button" disabled={!canStart} onClick={onStart}>Build & search all</Button>}
      {!running && canRetry && <Button type="button" variant="outline" onClick={onRetry}>Retry failed searches</Button>}
    </div>
    {status && <ol className={styles.buildTasks} aria-label="Build progress" aria-live="polite">
      {buildTasks.map(task => {
        const { state, detail } = status[task], review = reviewTab[task];
        return <li key={task} className={styles.buildTask} data-state={state}>
          <span className={styles.buildTaskName}>{buildTaskLabels[task]}</span>
          <span className={styles.buildTaskState}>{stateLabels[state]}</span>
          <span className={styles.buildTaskDetail}>{detail}</span>
          {review && state === "done" && !running && <button type="button" className="justify-self-start text-sm underline" onClick={() => onReview(review.tab)}>{review.label}</button>}
        </li>;
      })}
    </ol>}
  </section>;
}
