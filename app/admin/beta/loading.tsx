export default function BetaIntelligenceLoading() {
  return (
    <div className="min-h-screen bg-[#f1f0ed] px-4 py-10 dark:bg-[#0b0c0e] sm:px-8" role="status" aria-live="polite">
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">
        <span className="sr-only">Loading Beta Intelligence dashboard</span>
        <div className="h-4 w-40 rounded bg-neutral-300 dark:bg-neutral-800" />
        <div className="h-24 max-w-3xl rounded-3xl bg-neutral-300 dark:bg-neutral-800" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 rounded-3xl bg-neutral-300 lg:col-span-2 dark:bg-neutral-800" />
          <div className="h-64 rounded-3xl bg-neutral-300 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
