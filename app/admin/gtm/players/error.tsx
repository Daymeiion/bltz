"use client";

export default function GtmPlayerProspectsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1600px] items-center justify-center px-6">
      <div className="max-w-lg rounded-2xl border border-red-300 bg-white p-8 text-neutral-950 shadow-sm dark:border-red-900 dark:bg-neutral-900 dark:text-white" role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-300">Player prospecting unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">The Player Master list could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">No synthetic player records were substituted. Retry the authorized request or review the local database connection.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:bg-white dark:text-black">Retry Player Master</button>
      </div>
    </div>
  );
}

