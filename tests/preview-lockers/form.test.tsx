import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
const discovery = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/preview-lockers/stream-client", () => ({ readDiscovery: discovery.read }));
let host: HTMLDivElement; let root: Root; let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function fill(label: string, value: string) { const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`)!; await act(async () => { Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); }
async function click(text: string) { const button = [...host.querySelectorAll("button")].find(b => b.textContent === text)!; expect(button).toBeTruthy(); await act(async () => button.click()); }
it("reviews a college CSV, saves only to the private preview, and reloads the import", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await fill("Player source URL", "https://www.sports-reference.com/cfb/players/fixture-player-1.html");
  await fill("College statistics CSV", "Year,School,G,Solo,Ast,Tot,Sk\n2007,Fixture University,12,20,10,30,2.5");
  await click("Read CSV columns"); await click("Review college statistics");
  const add = [...host.querySelectorAll("button")].find(button => button.textContent === "Add reviewed statistics to draft")!;
  expect(add.disabled).toBe(true);
  const section = host.querySelector('section[aria-label="Import college statistics CSV"]')!;
  await act(async () => section.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await click("Add reviewed statistics to draft");
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: record.id, slug: record.slug, revision: 4 })));
  await click("Save draft");
  expect(fetcher.mock.calls[0][0]).toBe(`/api/preview-lockers/${record.id}`);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.revision).toBe(3);
  expect(body.content.cfb_stats[0].seasons[0].statistics.sacks).toBe(2.5);
  expect(body.content).not.toHaveProperty("player_id");
  await act(async () => root.render(<PreviewLockerForm key="reload" record={{ ...record, ...body.content, revision: 4 }} />));
  expect(host.textContent).toContain("defense · 1 season/team rows");
});
it("loads a local CSV file without uploading it to an external service", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  const input = host.querySelector<HTMLInputElement>('[aria-label="Upload college CSV"]')!;
  const text = "Season,Team,G,Sk\n2007,Fixture,12,2.5";
  const file = new File([text], "college.csv", { type: "text/csv" });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="College statistics CSV"]')!.value).toBe(text);
  expect(fetcher).not.toHaveBeenCalled();
  await click("Read CSV columns");
  expect(host.querySelector('[aria-label="Map column 4: Sk"]')).not.toBeNull();
});
it("retains manually entered biography and photo when discovery returns manual fallback", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  await fill("Full name", "Synthetic Preview"); await fill("Biography", "Manual biography"); await click("Add photo"); await fill("Photo 1 title", "Manual photo"); await fill("Photo 1 url", "https://example.com/manual.jpg");
  fetcher.mockResolvedValue(new Response("")); discovery.read.mockResolvedValue({ draft: previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), message: "Manual fallback" });
  await click("Build with web scraper");
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Manual biography"); expect(host.querySelector<HTMLInputElement>('[aria-label="Photo 1 url"]')!.value).toBe("https://example.com/manual.jpg");
  expect(host.textContent).toMatch(/nflverse NFL roster data.*cfbverse college roster data.*Wikipedia.*ESPN.*YouTube/);
  expect(host.textContent).toContain("Google Images is not queried");
});
it("requires review, retains create id on retry and exposes full saved navigation", async () => {
  await act(async () => root.render(<PreviewLockerForm />)); await fill("Full name", "Synthetic Preview");
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Save private preview")!.disabled).toBe(true);
  await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  fetcher.mockRejectedValueOnce(new Error("network failure")); await click("Save private preview");
  const first = JSON.parse(fetcher.mock.calls[0][1].body); fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: first.id, slug: "synthetic-preview", revision: 1 }), { status: 201 })); await click("Save private preview");
  expect(JSON.parse(fetcher.mock.calls[1][1].body).id).toBe(first.id); expect(host.textContent).toContain("Saved privately"); expect(host.querySelector('a[href="/preview-lockers/synthetic-preview/photos"]')).not.toBeNull();
});
it("retains a conflicted edit draft and supplies a full document reload link", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />)); await fill("Biography", "Unsaved edit"); await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()); fetcher.mockResolvedValue(new Response("{}", { status: 409 })); await click("Save changes privately");
  expect(host.textContent).toContain("Save conflict"); expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Unsaved edit"); expect(host.textContent).toContain("Reload saved version (discards unsaved draft)"); expect(JSON.parse(fetcher.mock.calls[0][1].body).revision).toBe(3);
});
it("keeps dirty drafts mounted by guarding same-tab navigation and opening saved previews in new tabs", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await fill("Biography", "Unsaved scraped result");
  const back = host.querySelector<HTMLAnchorElement>('a[href="/admin/preview-lockers"]')!;
  const navigation = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  await act(async () => back.dispatchEvent(navigation));
  expect(navigation.defaultPrevented).toBe(true);
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Unsaved scraped result");
  const dialog = document.querySelector('[role="alertdialog"]')!;
  expect(dialog.textContent).toContain("Leave this preview?");
  expect(dialog.textContent).toContain("Discard and leave");
  const stay = [...dialog.querySelectorAll("button")].find(button => button.textContent === "Stay and edit")!;
  await act(async () => stay.click());
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Unsaved scraped result");
  for (const href of ["/preview-lockers/synthetic-preview", "/preview-lockers/synthetic-preview/photos", "/preview-lockers/synthetic-preview/videos"]) {
    const preview = host.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;
    expect(preview.target).toBe("_blank");
    expect(preview.rel).toBe("noopener noreferrer");
  }
  const discard = host.querySelector<HTMLAnchorElement>('a[data-draft-discard="true"]')!;
  let discardReached = false;
  discard.addEventListener("click", event => { discardReached = true; event.preventDefault(); });
  await act(async () => discard.click());
  expect(discardReached).toBe(true);
});
it("warns on browser unload only while the draft is dirty", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  const cleanUnload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleanUnload);
  expect(cleanUnload.defaultPrevented).toBe(false);
  await fill("Biography", "Unsaved edit");
  const dirtyUnload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirtyUnload);
  expect(dirtyUnload.defaultPrevented).toBe(true);
  await fill("Biography", "");
  const revertedUnload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(revertedUnload);
  expect(revertedUnload.defaultPrevented).toBe(false);
});
it("offers an explicit discard-and-return path for a new unsaved draft", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  await fill("Full name", "Unsaved New Preview");
  const back = host.querySelector<HTMLAnchorElement>('a[href="/admin/preview-lockers"]:not([data-draft-discard])')!;
  const blocked = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  await act(async () => back.dispatchEvent(blocked));
  expect(blocked.defaultPrevented).toBe(true);
  const discard = host.querySelector<HTMLAnchorElement>('a[data-draft-discard="true"]')!;
  expect(discard.textContent).toContain("Discard unsaved draft");
  let discardReached = false;
  discard.addEventListener("click", event => { discardReached = true; event.preventDefault(); });
  await act(async () => discard.click());
  expect(discardReached).toBe(true);
});
it("blocks same-tab departure while an admitted discovery is still in flight", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  let finish!: (value: { draft: ReturnType<typeof previewContent.parse>; message: string }) => void;
  discovery.read.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  fetcher.mockResolvedValue(new Response(""));
  await act(async () => root.render(<PreviewLockerForm record={record} gtmLinked />));
  await click("Build with web scraper");
  const back = host.querySelector<HTMLAnchorElement>('a[href="/admin/preview-lockers"]')!;
  const navigation = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  await act(async () => back.dispatchEvent(navigation));
  expect(navigation.defaultPrevented).toBe(true);
  expect(host.textContent).toContain("Discovery is still running in this editor");
  expect(host.querySelector<HTMLAnchorElement>('a[data-draft-discard="true"]')!.getAttribute("aria-disabled")).toBe("true");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  await act(async () => finish({ draft: previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Recovered result" }), message: "Suggestions ready" }));
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Recovered result");
});
it("keeps discovery available for a linked saved draft and requires explicit persisted completion", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} gtmLinked />));
  expect([...host.querySelectorAll("button")].some(button => button.textContent === "Build with web scraper")).toBe(true);
  expect(host.textContent).toContain("Draft / incomplete");
  const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  expect(checks).toHaveLength(2);
  await act(async () => checks[1].click());
  fetcher.mockResolvedValue(new Response(JSON.stringify({ complete: true, revision: 3, unchanged: false })));
  await click("Mark preview complete");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ revision: 3 });
  expect(host.textContent).toContain("Preview complete");
  expect(host.textContent).toContain("identity and media rights remain unverified");
});
it("clears completed presentation after a persisted content edit", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Reviewed" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} gtmLinked gtmCompleted />));
  expect(host.textContent).toContain("Preview complete");
  await fill("Biography", "Persisted change");
  await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  fetcher.mockResolvedValue(new Response(JSON.stringify({ id: record.id, slug: record.slug, revision: 4, complete: false, completionStatus: "available" })));
  await click("Save changes privately");
  expect(host.textContent).toContain("Draft / incomplete");
});

it("allows an emptied new preview to close after typing and clearing its name", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  await fill("Full name", "Temporary draft");
  await fill("Full name", "");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);
});

it("saves an incomplete private draft without review or enrollment and allows departure", async () => {
  await act(async () => root.render(<PreviewLockerForm enrollmentEnabled />));
  await fill("Full name", "Draft Navigation Fixture");
  fetcher.mockImplementation(async (_url, options) => {
    const body = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: body.id, slug: body.content.slug, revision: 1 }), { status: 201 });
  });
  await click("Save draft");
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.enrollment).toBeUndefined();
  expect(body.content.bio).toBe("");
  expect(body.content.full_name).toBe("Draft Navigation Fixture");
  expect(host.textContent).toContain("Draft saved privately");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);
});
it("retains draft edits when saving fails and still validates media", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  await fill("Full name", "Draft Failure Fixture");
  await fill("Headshot HTTPS URL", "javascript:alert(1)");
  await click("Save draft");
  expect(fetcher).not.toHaveBeenCalled();
  await fill("Headshot HTTPS URL", "");
  fetcher.mockRejectedValueOnce(new Error("network failure"));
  await click("Save draft");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Full name"]')!.value).toBe("Draft Failure Fixture");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
});

it("opens stats-only tools above career totals without scraping or replacing the draft", async () => {
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Keep biography", career_stats: [{ key: "tackles", value: 42 }], awards: [{ year: "2007", label: "Keep award" }] }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await fill("Biography", "Keep unsaved biography");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ player: null, linked: false })));
  await click("Pull Sportradar stats only");
  expect(fetcher.mock.calls[0][0]).toContain("?previewId=");
  expect(host.textContent!.indexOf("Sportradar statistics")).toBeLessThan(host.textContent!.indexOf("Career statistics"));
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ players: [] })));
  await click("Search BLTZ");
  expect(fetcher.mock.calls[1][0]).toContain("/api/admin/sportradar?q=");
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Keep unsaved biography");
  expect(host.querySelector<HTMLInputElement>('[aria-label="TACKLES"]')!.value).toBe("42");
  expect(host.querySelector<HTMLInputElement>('[aria-label="Award 1 label"]')!.value).toBe("Keep award");
  expect(host.textContent).toContain("Save any unsaved builder changes before importing");
});
it("requires a saved preview before offering stats import", async () => {
  await act(async () => root.render(<PreviewLockerForm />));
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Pull Sportradar stats only")!.disabled).toBe(true);
  expect(fetcher).not.toHaveBeenCalled();
});

it("imports only reviewed Sportradar statistics and requires reload without saving stale content", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const record = { ...previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview", bio: "Keep biography" }), id, revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ player: null, linked: false })));
  await click("Pull Sportradar stats only");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ players: [{ id, full_name: "Synthetic Preview", school: "USC" }] })));
  await click("Search BLTZ");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ mappings: [{ league: "nfl", provider_player_id: id }], ingestions: [] })));
  await act(async () => { await vi.waitFor(() => expect(host.querySelector("ul button")).not.toBeNull()); });
  await act(async () => host.querySelector<HTMLButtonElement>("ul button")!.click());
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id, status: "MANUAL_REVIEW", normalized: {}, player: { id, full_name: "Synthetic Preview" }, fetched_at: "2026-09-16" })));
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ successful: 1 })));
  await click("Fetch / use cached profile");
  const approval = [...host.querySelectorAll("label")].find(l => l.textContent?.includes("I verified this profile"))!.querySelector<HTMLInputElement>("input")!;
  await act(async () => approval.click());
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ status: "IMPORTED" })));
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ successful: 1 })));
  await click("Approve mapping and import statistics");
  const writes = fetcher.mock.calls.filter(call => call[1]?.method === "POST");
  expect(writes.map(call => JSON.parse(call[1].body).action)).toEqual(["preview", "import"]);
  expect(writes.every(call => call[0] === "/api/admin/sportradar")).toBe(true);
  expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe("Keep biography");
  expect(host.textContent).toContain("Reload the saved version before editing");
  expect(host.querySelector("fieldset")!.disabled).toBe(true);
});


it("preserves media link edits across collapse and saves removal from the draft", async () => {
  const record = { ...previewContent.parse({ slug: "media-fixture", full_name: "Media Fixture", photos: [{ id: "photo-1", title: "Career photo", url: "https://example.com/old.jpg", level: "pro" }], videos: [{ id: "video-1", title: "Highlight", url: "https://example.com/film.mp4" }] }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  const input = host.querySelector<HTMLInputElement>('[aria-label="Photo 1 url"]')!;
  const row = input.closest("details")!;
  const section = row.parentElement!.closest("details")!;
  await act(async () => { section.open = true; section.dispatchEvent(new Event("toggle")); row.open = true; row.dispatchEvent(new Event("toggle")); });
  await fill("Photo 1 url", "https://example.com/new.jpg");
  await act(async () => { row.open = false; row.dispatchEvent(new Event("toggle")); });
  await act(async () => { row.open = true; row.dispatchEvent(new Event("toggle")); });
  expect(input.value).toBe("https://example.com/new.jpg");
  expect(row.querySelector('img[alt="Career photo"]')?.getAttribute("src")).toBe("https://example.com/new.jpg");
  await click("Remove video from draft");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ id: record.id, slug: record.slug, revision: 4 })));
  await click("Save draft");
  const content = JSON.parse(fetcher.mock.calls[0][1].body).content;
  expect(content.photos[0].url).toBe("https://example.com/new.jpg");
  expect(content.videos).toEqual([]);
});

it("loads the saved athlete and provider mapping without a second search", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const record = { ...previewContent.parse({ slug: "linked-preview", full_name: "Linked Athlete" }), id, revision: 1, created_at: "", updated_at: "" };
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ linked: true, player: { id, full_name: "Linked Athlete" }, mappings: [{ league: "nfl", provider_player_id: id }] })));
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await click("Pull Sportradar stats only");
  expect(fetcher.mock.calls[0][0]).toBe("/api/admin/sportradar?previewId=" + id);
  expect(host.textContent).not.toContain("Search BLTZ");
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Fetch / use cached profile")!.disabled).toBe(false);
});
it("shows an actionable failure and retries the saved athlete lookup", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const record = { ...previewContent.parse({ slug: "linked-preview", full_name: "Linked Athlete" }), id, revision: 1, created_at: "", updated_at: "" };
  fetcher.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await click("Pull Sportradar stats only");
  expect(host.textContent).toContain("request timed out");
  expect(host.textContent).not.toContain("Search BLTZ");
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ linked: true, player: { id, full_name: "Linked Athlete" }, mappings: [] })));
  await click("Retry athlete lookup");
  expect(host.textContent).toContain("No saved Sportradar mapping");
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Fetch / use cached profile")!.disabled).toBe(true);
});

it("requires review before creating the linked master identity and then unlocks provider controls", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const record = { ...previewContent.parse({ slug: "master-preview", full_name: "Master Athlete" }), id, revision: 1, created_at: "", updated_at: "" };
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ linked: true, player: null, master: { gsis_id: "GSIS", display_name: "Master Athlete" }, candidates: [] })));
  await act(async () => root.render(<PreviewLockerForm record={record} />));
  await click("Pull Sportradar stats only");
  expect([...host.querySelectorAll("button")].find(b => b.textContent === "Confirm athlete identity")!.disabled).toBe(true);
  const approval = [...host.querySelectorAll("label")].find(l => l.textContent?.includes("I reviewed this athlete"))!.querySelector<HTMLInputElement>("input")!;
  await act(async () => approval.click());
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ playerId: id })));
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ linked: true, player: { id, full_name: "Master Athlete" }, mappings: [] })));
  await click("Confirm athlete identity");
  const write=fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
  expect(JSON.parse(write[1].body)).toEqual({ action: "link_identity", previewId: id, gsisId: "GSIS", existingPlayerId: null, approved: true });
  expect(host.textContent).toContain("Fetch / use cached profile");
  expect(host.textContent).not.toContain("Search BLTZ");
});
