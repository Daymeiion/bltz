export default function GtmContactsLoading() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-8 sm:px-8" role="status" aria-live="polite">
      <span className="sr-only">Loading GTM contacts</span>
      <div className="animate-pulse space-y-5">
        <div className="h-7 w-48 rounded-lg bg-neutral-300 dark:bg-neutral-800" />
        <div className="h-12 max-w-xl rounded-xl bg-neutral-300 dark:bg-neutral-800" />
        <div className="h-16 rounded-2xl bg-neutral-300 dark:bg-neutral-800" />
        <div className="h-[28rem] rounded-2xl bg-neutral-300 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
