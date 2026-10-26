import { expect, it, vi } from "vitest";
import { limitSearchProvider } from "@/lib/enrichment/search-limiter";
it("bounds aggregate provider calls and drains queued jobs", async () => {
  const releases: Array<() => void> = []; let active = 0, maximum = 0;
  const search = vi.fn(async () => { active++; maximum = Math.max(maximum, active); await new Promise<void>(resolve => releases.push(resolve)); active--; return []; });
  const provider = limitSearchProvider({ name: "fixture", search }, 2), signal = new AbortController().signal;
  const work = Array.from({ length: 6 }, (_, i) => provider.search(String(i), signal));
  await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  for (let i = 0; i < 6; i++) { await vi.waitFor(() => expect(releases[i]).toBeTypeOf("function")); releases[i](); }
  await Promise.all(work); expect(maximum).toBe(2); expect(search).toHaveBeenCalledTimes(6);
});
it("removes aborted queued searches without admitting them or spending a provider call", async () => {
  let finish!: () => void;
  const search = vi.fn(async () => { await new Promise<void>(resolve => { finish = resolve; }); return []; });
  const provider = limitSearchProvider({ name: "fixture", search }, 1), controller = new AbortController();
  const first = provider.search("first", new AbortController().signal), queued = provider.search("cancel", controller.signal);
  const assertion = expect(queued).rejects.toThrow(); controller.abort(); await assertion;
  await vi.waitFor(() => expect(finish).toBeDefined()); finish(); await first; expect(search).toHaveBeenCalledOnce();
});
