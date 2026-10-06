// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import { EditorialCard } from "@/components/player/EditorialCard";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import type { PlayerArticle } from "@/lib/enrichment/news";
import EnrichmentPanel from "@/app/admin/preview-lockers/EnrichmentPanel";
import type { EnrichmentReport } from "@/lib/preview-lockers/enrichment";
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const data = () => previewLockerData({ ...previewContent.parse({ full_name: "Fixture Athlete", slug: "fixture-athlete" }), id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" });
async function mediaTab() { const button = [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === "MEDIA")!; await act(async () => button.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }))); }
async function awardsTab() {
  const career = [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === "CAREER")!;
  await act(async () => career.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true })));
  const awards = [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === "AWARDS")!;
  await act(async () => awards.click());
}
it("renders a news empty state without sample stories or provider calls", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await act(async () => root.render(<LockerView data={data()} />)); await mediaTab();
  expect(host.textContent).toContain("No matching news articles"); expect(host.textContent).not.toContain("DRAFT STOCK RISING"); expect(fetcher).not.toHaveBeenCalled();
});
it("renders saved publisher/date cards with an original-publisher destination", async () => {
  const article = { headline: "Career remembered", publisher: "Cal News", summary: "A short description.", article_url: "https://cal.example.com/story", thumbnail_url: null, published_at: "2025-09-01T00:00:00Z" } as PlayerArticle;
  await act(async () => root.render(<LockerView data={{ ...data(), articles: [article] }} />)); await mediaTab();
  expect(host.textContent).toContain("Career remembered"); expect(host.textContent).toContain("Cal News"); expect(host.textContent?.toLowerCase()).toContain("sep 1, 2025");
  const read = [...host.querySelectorAll("button")].find(b => b.textContent?.startsWith("Read article"))!; await act(async () => read.click());
  expect(host.textContent).toContain("redirected to Cal News");
  const navigate = vi.spyOn(window.location, "assign").mockImplementation(() => {});
  const continueButton = [...host.querySelectorAll("button")].find(b => b.textContent === "Continue now")!;
  await act(async () => continueButton.click());
  expect(navigate).toHaveBeenCalledWith("https://cal.example.com/story"); navigate.mockRestore();
});
it("falls back after an image load failure and retains the article action", async () => {
  const click = vi.fn();
  await act(async () => root.render(<EditorialCard title="News" image="https://images.example.com/missing.jpg" onClick={click} />));
  await act(async () => host.querySelector("img")!.dispatchEvent(new Event("error")));
  expect(host.querySelector("img")).toBeNull();
  await act(async () => host.querySelector("button")!.click()); expect(click).toHaveBeenCalledOnce();
});
it("labels preview award evidence unverified, even if a caller supplies verified status", async () => {
  await act(async () => root.render(<LockerView data={{ ...data(), awards: [{ label: "Heisman Trophy", year: "2001", evidenceStatus: "verified" }] }} />));
  await awardsTab();
  expect(host.textContent).toContain("Unverified evidence");
  expect(host.textContent).not.toContain("Verified award");
});
it("uses evidence language in the private awards empty state", async () => {
  await act(async () => root.render(<LockerView data={data()} />));
  await awardsTab();
  expect(host.textContent).toContain("No award evidence"); expect(host.textContent).not.toContain("No verified awards");
});
it("shows failed attempt separately from successful news diagnostics", async () => {
  const report: EnrichmentReport = { status: "complete", news_status: "complete", updated_at: "2026-09-29T01:00:00Z", awards_discovered: 1, awards_normalized: 1, unmapped_awards: [], article_candidates: 5, articles_accepted: 3, articles_rejected: 2, article_duplicates: 0, errors: [] };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ report: { ...report, status: "unavailable", news_status: "unavailable", articles_accepted: 0, updated_at: "2026-09-29T02:00:00Z", errors: ["search_failed"], last_news_success: report } }) })));
  await act(async () => root.render(<EnrichmentPanel id="preview" initialReport={{ ...report, last_news_success: report }} stale={false} />));
  await act(async () => host.querySelector("button")!.click());
  expect(host.textContent).toContain("News: unavailable"); expect(host.textContent).toContain("3 accepted");
  expect(host.textContent).toContain("search_failed"); expect(host.textContent).toContain("Previous matching articles are retained");
  expect(host.textContent).toContain("The attempt was saved"); expect(host.textContent).not.toContain("could not be saved");
});

it("retains saved diagnostics and stale state when a timestamped attempt was not persisted", async () => {
  const success: EnrichmentReport = { status: "complete", news_status: "complete", updated_at: "2026-09-29T01:00:00Z", awards_discovered: 1, awards_normalized: 1, unmapped_awards: [], article_candidates: 5, articles_accepted: 3, articles_rejected: 2, article_duplicates: 0, errors: [] };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ report: {
    ...success, status: "unavailable", news_status: "unavailable", updated_at: "2026-10-05T01:00:00Z", errors: ["enrichment_unavailable", "enrichment_not_saved"],
  } }) })));
  await act(async () => root.render(<EnrichmentPanel id="preview" initialReport={{ ...success, last_news_success: success }} stale />));
  await act(async () => host.querySelector("button")!.click());
  expect(host.textContent).toContain("Enrichment could not be saved");
  expect(host.textContent).toContain("preview edited since last enrichment");
  expect(host.textContent).toContain("News: complete");
  expect(host.textContent).toContain("3 accepted");
  expect(host.textContent).not.toContain("2026-10-05T01:00:00Z");
});

it.each([
  ["search_not_configured", "Set the server-only Tavily API key"],
  ["search_auth_failed", "Tavily rejected the credential"],
  ["search_quota_exceeded", "usage limit was reached"],
  ["search_rate_limited", "rate limited"],
  ["search_timeout", "timed out"],
  ["search_aborted", "interrupted"],
  ["search_unavailable", "temporarily unavailable"],
  ["search_invalid_response", "invalid response"],
])("explains %s without replacing prior success diagnostics", async (code, message) => {
  const success: EnrichmentReport = { status: "complete", news_status: "complete", updated_at: "2026-09-29T01:00:00Z", awards_discovered: 0, awards_normalized: 0, unmapped_awards: [], article_candidates: 2, articles_accepted: 2, articles_rejected: 0, article_duplicates: 0, errors: [] };
  await act(async () => root.render(<EnrichmentPanel id="preview" stale={false} initialReport={{ ...success, news_status: "unavailable", errors: [code], last_news_success: success }} />));
  expect(host.textContent).toContain(message); expect(host.textContent).toContain("2 accepted");
  expect(host.textContent).toContain("Previous matching articles are retained");
});
it.each(["error", "load"])("shows a clear unavailable state for %s image responses", async event => {
  await act(async () => root.render(<EditorialCard title="Career news" image="https://cdn.example.com/image" onClick={() => {}} />));
  const image = host.querySelector("img")!;
  Object.defineProperty(image, "naturalWidth", { value: 1 });
  Object.defineProperty(image, "naturalHeight", { value: 1 });
  await act(async () => image.dispatchEvent(new Event(event)));
  expect(host.querySelector("img")).toBeNull();
  expect(host.textContent).toContain("Article image unavailable");
  expect(host.textContent).toContain("Read article");
});
