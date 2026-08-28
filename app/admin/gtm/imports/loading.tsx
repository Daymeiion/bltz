export default function GtmImportsLoading() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-8 sm:px-8" role="status" aria-live="polite">
      <span className="sr-only">Loading GTM imports</span>
      <div className="animate-pulse space-y-5"><div className="h-24 rounded-2xl bg-neutral-300 dark:bg-neutral-800" /><div className="h-16 rounded-2xl bg-neutral-300 dark:bg-neutral-800" /><div className="h-[30rem] rounded-2xl bg-neutral-300 dark:bg-neutral-800" /></div>
    </div>
  );
}
