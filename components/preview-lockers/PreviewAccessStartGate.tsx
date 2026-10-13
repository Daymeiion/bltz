"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function PreviewAccessStartGate({ previewId }: { previewId: string }) {
  const router = useRouter();
  const running = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback(async () => {
    if (document.visibilityState !== "visible" || running.current) return;
    running.current = true;
    try {
      const response = await fetch("/api/preview-link-access/start", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, visibility: "visible" }), cache: "no-store" });
      const result = await response.json();
      if (!response.ok || result.state !== "active") throw new Error(response.status === 404 ? "This preview is no longer available. Ask BLTZ for access." : "We could not open this preview. Please try again.");
      router.refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "We could not open this preview. Please try again."); running.current = false; }
  }, [previewId, router]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void start(); });
    const visible = () => { void start(); };
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; document.removeEventListener("visibilitychange", visible); };
  }, [start]);
  return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-5 px-6 text-white">
    <p className="text-sm uppercase tracking-widest text-[#ffbb00]">BLTZ Locker preview</p>
    <h1 className="text-3xl font-bold">{error ? "Preview access" : "Opening your preview"}</h1>
    <p className="text-white/70">Anyone with this link can view the preview. The shared 48-hour viewing window begins when it first opens.</p>
    {error ? <><p role="alert">{error}</p><button type="button" onClick={() => { setError(null); void start(); }} className="w-fit rounded border border-[#ffbb00] px-5 py-3 text-[#ffbb00] focus-visible:outline focus-visible:outline-2">Try again</button></> : <p role="status">Opening…</p>}
  </main>;
}
