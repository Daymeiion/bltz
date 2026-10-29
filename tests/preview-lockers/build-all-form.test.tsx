import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";

const id = "00000000-0000-4000-8000-000000000001";
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal", bio: "Kept bio." }), id, revision: 3, created_at: "", updated_at: "" };
const awards = { status: "complete" as const, awards_discovered: 1, awards_normalized: 1, unmapped_awards: [], errors: [], updated_at: "2026-10-29T00:00:00Z", source_revision: 4 };
const enrichment = { ...awards, last_awards_attempt: awards, news_status: "complete", article_candidates: 2, articles_accepted: 2, articles_rejected: 0, article_duplicates: 0 };
const newsBody = { revision: 4, articles: [], review: { articles: [], version: 2, searched_at: "2026-10-29T00:00:00Z", identity_key: "a".repeat(64) } };
const merch = { items: [], status: "complete" as const, candidates: 0, rejected: 0, errors: [] };
const merchBody = { revision: 4, result: merch, review: { result: merch, version: 1, searched_at: "2026-10-29T00:00:00Z", identity_key: "a".repeat(64), dismissed_items: [], dismissed_urls: [] } };
const combineBody = { revision: 4, result: { suggestions: [], sources: [], status: "complete" } };
const discoveryStream = (draft: unknown) => new Response(`event: event\ndata: {"message":"A source returned suggestions."}\n\nevent: done\ndata: ${JSON.stringify({ status: "complete", draft })}\n\n`, { headers: { "Content-Type": "text/event-stream" } });

let host: HTMLDivElement, root: Root, fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const button = (text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find(x => x.textContent === text);
const row = (name: string) => [...host.querySelectorAll("li")].find(li => li.textContent?.startsWith(name))!;
const calls = () => fetcher.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`);
const routes = (overrides: Record<string, () => Response> = {}) => fetcher.mockImplementation(async (url: string, init?: RequestInit) => {
  const key = `${init?.method ?? "GET"} ${url}`;
  if (overrides[key]) return overrides[key]();
  if (key === "POST /api/preview-lockers/discovery") return discoveryStream(previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal", bio: "Scraped bio.", position: "CB" }));
  if (key === `PATCH /api/preview-lockers/${id}`) return Response.json({ id, slug: "fixture-player", revision: 4, enrichment });
  if (key === `GET /api/preview-lockers/${id}/news`) return Response.json(newsBody);
  if (key === `POST /api/preview-lockers/${id}/merchandise`) return Response.json(merchBody);
  if (key === `POST /api/preview-lockers/${id}/combine`) return Response.json(combineBody);
  throw new Error(`unexpected ${key}`);
});

it("runs career search, one save with news, then the saved-revision searches without repeating news", async () => {
  routes();
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await act(async () => button("Build & search all")!.click());
  expect(calls()[0]).toBe("POST /api/preview-lockers/discovery");
  expect(calls()[1]).toBe(`PATCH /api/preview-lockers/${id}`);
  expect(calls().slice(2).sort()).toEqual([`GET /api/preview-lockers/${id}/news`, `POST /api/preview-lockers/${id}/combine`, `POST /api/preview-lockers/${id}/merchandise`]);
  const save = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(save).toMatchObject({ revision: 3, refreshNews: true });
  // Merge fills blanks only: the existing bio is kept, the missing position is filled.
  expect(save.content.bio).toBe("Kept bio.");
  expect(save.content.position).toBe("CB");
  // Searches run against the newly saved revision.
  expect(JSON.parse(fetcher.mock.calls.find(([url]) => String(url).endsWith("/merchandise"))![1].body)).toEqual({ revision: 4 });
  expect(JSON.parse(fetcher.mock.calls.find(([url]) => String(url).endsWith("/combine"))![1].body)).toEqual({ revision: 4 });
  for (const name of ["Career details", "Save private draft", "Awards", "News", "Merchandise", "Combine"]) expect(row(name).getAttribute("data-state")).toBe("done");
  expect(row("Save private draft").textContent).toContain("revision 4");
  expect(host.textContent).toContain("Review in Media");
});

it("keeps successful results when one search fails and retries only the failed one", async () => {
  routes({ [`POST /api/preview-lockers/${id}/merchandise`]: () => Response.json({ error: "merchandise_rate_limited" }, { status: 429 }) });
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await act(async () => button("Build & search all")!.click());
  expect(row("Merchandise").getAttribute("data-state")).toBe("failed");
  expect(row("Merchandise").textContent).toContain("cooling down");
  expect(row("News").getAttribute("data-state")).toBe("done");
  expect(row("Combine").getAttribute("data-state")).toBe("done");
  fetcher.mockClear(); routes();
  await act(async () => button("Retry failed searches")!.click());
  expect(calls()).toEqual([`POST /api/preview-lockers/${id}/merchandise`]);
  expect(row("Merchandise").getAttribute("data-state")).toBe("done");
});

it("stops before saving when the career search is rate limited", async () => {
  routes({ "POST /api/preview-lockers/discovery": () => Response.json({ error: "discovery_rate_limited" }, { status: 429 }) });
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await act(async () => button("Build & search all")!.click());
  expect(calls()).toEqual(["POST /api/preview-lockers/discovery"]);
  expect(row("Career details").getAttribute("data-state")).toBe("failed");
  expect(row("Save private draft").getAttribute("data-state")).toBe("skipped");
});

it("reports a news cooldown from the save without searching news again", async () => {
  routes({ [`PATCH /api/preview-lockers/${id}`]: () => Response.json({ id, slug: "fixture-player", revision: 4, enrichment: { ...enrichment, news_status: "unavailable", errors: ["news_rate_limited"] } }) });
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await act(async () => button("Build & search all")!.click());
  expect(calls().filter(call => call === `POST /api/preview-lockers/${id}/news`)).toEqual([]);
  expect(row("News").getAttribute("data-state")).toBe("failed");
  expect(row("News").textContent).toContain("cooling down");
  expect(row("Awards").getAttribute("data-state")).toBe("done");
});

it("cancels remaining work and keeps the panel usable", async () => {
  let release: (value: Response) => void = () => {};
  fetcher.mockImplementation((_url: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    release = resolve;
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await act(async () => button("Build & search all")!.click());
  expect(row("Career details").getAttribute("data-state")).toBe("running");
  await act(async () => button("Cancel remaining work")!.click());
  expect(row("Career details").getAttribute("data-state")).toBe("skipped");
  expect(row("Save private draft").textContent).toContain("Cancelled");
  expect(calls()).toEqual(["POST /api/preview-lockers/discovery"]);
  expect(button("Build & search all")!.disabled).toBe(false);
  release(new Response(""));
});
