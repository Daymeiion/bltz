"use client";
export default function ErrorState({reset}:{reset:()=>void}){return <section className="space-y-4 p-8"><h1 className="text-2xl">Preview funnel unavailable</h1><p role="alert">Records could not be loaded. No zero totals are being reported.</p><button className="min-h-11 rounded border px-4" onClick={reset}>Retry</button></section>;}
