import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PartnershipsPage from "@/app/admin/partnerships/page";
import VeritonePilotPage from "@/app/admin/partnerships/veritone/page";
import VeritoneWorkflowPage from "@/app/admin/partnerships/veritone/workflow/page";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

vi.mock("@/lib/rbac", () => ({ getCurrentAuthorizationProfile: vi.fn() }));

const brief = {
  summary: "Private pilot summary",
  archive: "Private archive",
  cohort: "Test athlete cohort",
  preferredPartner: "Test institution",
  duration: "Test pilot window",
  proofTitle: "Private proof point",
  proofDetails: "Private play details",
  proofRights: "Clearance pending",
  timeline: ["Scope dates", "Proof dates", "Cohort dates", "Review dates"],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Partnership meeting navigation", () => {
  it("links each partner card to its own meeting materials", () => {
    document.body.innerHTML = renderToStaticMarkup(<PartnershipsPage />);
    expect(document.querySelector('a[href="/admin/partnerships/getty"] h2')?.textContent).toBe("Getty Images");
    expect(document.querySelector('a[href="/admin/partnerships/veritone"] h2')?.textContent).toBe("Veritone");
  });

  it("links both Veritone views and presents the configured brief to admins", async () => {
    vi.stubEnv("BLTZ_VERITONE_PILOT_BRIEF", JSON.stringify(brief));
    vi.mocked(getCurrentAuthorizationProfile).mockResolvedValue({ role: "admin", id: "test", email: null, display_name: null, avatar_url: null, player_id: null });
    document.body.innerHTML = renderToStaticMarkup(await VeritonePilotPage());
    expect(document.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/admin/partnerships/veritone");
    expect(document.querySelector('a[href="/admin/partnerships/veritone/workflow"]')).not.toBeNull();
    expect(document.body.textContent).toContain(brief.proofTitle);

    document.body.innerHTML = renderToStaticMarkup(await VeritoneWorkflowPage());
    expect(document.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/admin/partnerships/veritone/workflow");
    expect(document.querySelector('a[href="/admin/partnerships/veritone"]')).not.toBeNull();
    expect(document.querySelector('a[href="/admin/partnerships"]')).not.toBeNull();
    expect([...document.querySelectorAll('[aria-labelledby="pilot-handoff"] h3')].map((element) => element.textContent)).toEqual([
      "Discover", "Match", "Clear", "Activate", "Measure",
    ]);
    expect([...document.querySelectorAll('[aria-labelledby="pilot-timeline"] li > div:first-child > p')].map((element) => element.textContent)).toEqual(brief.timeline);
  });

  it("does not render the configured pilot details without an admin profile", async () => {
    vi.stubEnv("BLTZ_VERITONE_PILOT_BRIEF", JSON.stringify(brief));
    vi.mocked(getCurrentAuthorizationProfile).mockResolvedValue(null);
    expect(renderToStaticMarkup(await VeritonePilotPage())).not.toContain(brief.proofTitle);
    expect(renderToStaticMarkup(await VeritoneWorkflowPage())).not.toContain(brief.timeline[0]);
  });
});
