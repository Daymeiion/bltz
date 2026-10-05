"use client";

export default function IntelligenceError({ reset }: { reset: () => void }) {
  return <section className="space-y-3 p-6"><h1 className="text-2xl font-semibold">Intelligence Lab unavailable</h1><p role="alert">Career records could not be loaded.</p><button onClick={reset} className="min-h-11 rounded bg-[#ffbb00] px-4 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbb00]">Try again</button></section>;
}
