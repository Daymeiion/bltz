export default function GtmOverviewLoading() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-8 sm:px-8" role="status" aria-live="polite">
      <span className="sr-only">Loading GTM overview</span>
      <div className="animate-pulse space-y-6">
        <div className="h-24 rounded-2xl bg-neutral-300 dark:bg-neutral-800" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="h-28 rounded-xl bg-neutral-300 dark:bg-neutral-800" />)}</div>
        <div className="grid gap-5 lg:grid-cols-2"><div className="h-80 rounded-2xl bg-neutral-300 dark:bg-neutral-800" /><div className="h-80 rounded-2xl bg-neutral-300 dark:bg-neutral-800" /></div>
      </div>
    </div>
  );
}
