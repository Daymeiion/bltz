"use client";
export default function PreviewError({ reset }: { reset: () => void }) { return <div className="space-y-4 p-8"><p role="alert">Private previews are unavailable. Check your Admin session and try again.</p><button type="button" onClick={reset} className="rounded-md border px-4 py-3">Try again</button></div>; }
