"use client";

export default function BetaIntelligenceError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f1f0ed] px-6 dark:bg-[#0b0c0e]">
      <div className="max-w-lg rounded-3xl border border-red-300 bg-white p-8 text-neutral-950 shadow-sm dark:border-red-900 dark:bg-neutral-900 dark:text-white" role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700 dark:text-red-300">Dashboard unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Live beta data could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">No fixture data was substituted. Retry the authorized aggregate request, or check the server logs if the problem continues.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:bg-white dark:text-black">
          Retry live query
        </button>
      </div>
    </div>
  );
}
