import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { previewContent } from "@/lib/preview-lockers/validation";

// Regression: preview Locker dropped scalar college and showed no persisted career statistics.
// Found by /qa on 2026-09-08.
let host: HTMLDivElement; let root: Root;
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it("renders the draft college and explicit sourced stats without demo values", async () => {
  const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Fixture University", games_played: 42, career_stats: [{ key: "tackles", value: 127 }, { key: "sacks", value: 8.5 }] });
  const record = { ...content, id: "00000000-0000-4000-8000-000000000001", revision: 1, created_at: "", updated_at: "" };
  const data = previewLockerData(record);
  expect(data.school).toEqual({ name: "Fixture University", abbr: "F", primaryColor: "#1A3DCC", logoUrl: null });
  expect(data.schools).toEqual([{ label: "F", name: "Fixture University", color: "#1A3DCC", logo: null }]);
  expect(data.careerStats).toEqual([{ key: "tackles", label: "TACKLES", value: 127 }, { key: "sacks", label: "SACKS", value: "8.5" }]);
  await act(async () => root.render(<LockerView data={data} />));
  expect(host.textContent).toContain("Fixture University");
  const career = [...host.querySelectorAll("button")].find(button => button.textContent?.trim() === "CAREER")!;
  await act(async () => career.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true })));
  expect(host.textContent).toContain("127");
  expect(host.textContent).toContain("8.5");
  expect(host.textContent).toContain("TACKLES");
  expect(host.textContent).toContain("SACKS");
  const history = host.querySelector('.team-history-sequence:not([aria-hidden="true"])');
  expect(history?.querySelector(".team-history-abbreviation")?.textContent).toBe("F");
  expect(history?.querySelector(".team-history-full-name")?.textContent).toBe("Fixture University");
  const statCards = [...host.querySelectorAll(".career-stat-card")];
  for (const [label, value] of [["GAMES", "42"], ["TACKLES", "127"], ["SACKS", "8.5"]]) {
    const card = statCards.find(node => node.children[1]?.textContent === label);
    expect(card?.children[0]?.textContent).toBe(value);
  }
});

it("accepts only bounded owned storage locators", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  expect(previewContent.safeParse({ slug: "fixture-player", full_name: "Fixture Player", photos: [{ id: "photo-1", title: "Upload", storagePath: `${id}/photos/00000000-0000-4000-8000-000000000002.jpg`, mimeType: "image/jpeg", credits: null, sourceUrl: null, level: "cfb", season: null }] }).success).toBe(true);
  expect(previewContent.safeParse({ slug: "fixture-player", full_name: "Fixture Player", videos: [{ id: "video-1", title: "Wrong type", storagePath: `${id}/videos/00000000-0000-4000-8000-000000000002.jpg`, mimeType: "image/jpeg", thumb: null }] }).success).toBe(false);
  expect(previewContent.safeParse({ slug: "fixture-player", full_name: "Fixture Player", career_stats: [{ key: "tackles", value: -1 }] }).success).toBe(false);
  expect(previewContent.safeParse({ slug: "fixture-player", full_name: "Fixture Player", career_stats: [{ key: "tackles", value: 1.5 }] }).success).toBe(false);
  expect(previewContent.safeParse({ slug: "fixture-player", full_name: "Fixture Player", career_stats: [{ key: "sacks", value: 8.5 }] }).success).toBe(true);
});
