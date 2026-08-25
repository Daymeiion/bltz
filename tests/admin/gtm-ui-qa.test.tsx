import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GtmMetrics } from "@/lib/gtm/server";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/gtm/imports" }));
vi.mock("@/app/admin/gtm/actions", () => ({ commitGtmCsv: vi.fn(), inspectGtmCsv: vi.fn(), previewGtmCsv: vi.fn() }));

import { GtmImportWorkspace } from "@/components/admin/gtm/GtmImportWorkspace";
import { GtmOverview } from "@/components/admin/gtm/GtmOverview";

const metrics: GtmMetrics = {
  generatedAt: "2026-08-25T12:00:00.000Z", since: "2026-07-26T12:00:00.000Z",
  totalContacts: 24, contactTypeCounts: { enterprise: 9, athlete: 6, multiplier: 5, investor: 4 }, segmentCounts: {},
  tierAContacts: 4, tierBContacts: 7, priorityContacts: 6, enterpriseContacts: 9, athleteContacts: 6,
  multiplierContacts: 5, activeConversations: 8, contactsNeedingFollowUp: 3, discoveryConversations: 5,
  demoCandidates: 2, pilotCandidates: 2, activePilots: 1, conversions: 1, playerLinkedContacts: 4,
  discoveryAnalysis: { problems: [], useCases: [], features: [], objections: [], pilotIntent: { yes: 0, no: 0, unknown: 0 }, willingnessToPay: { yes: 0, no: 0, unknown: 0 } },
};

describe("Prompt 4 GTM Admin experience", () => {
  it("renders the executive overview metrics and operating queues", () => {
    const markup = renderToStaticMarkup(<GtmOverview data={{ state: "ready", contacts: [], generatedAt: metrics.generatedAt }} metrics={metrics} />);
    for (const label of ["Total relevant contacts", "Enterprise", "Athletes", "Multipliers", "Priority contacts", "Needs follow-up", "Discovery conversations", "Demo candidates", "Pilot candidates", "Active pilots", "Conversions", "Needs attention", "Upcoming follow-ups", "Recent activity", "Pipeline summary"]) {
      expect(markup).toContain(label);
    }
  });

  it("renders a dedicated seven-step import surface before a file is committed", () => {
    const markup = renderToStaticMarkup(<GtmImportWorkspace />);
    for (const step of ["Upload", "Map fields", "Validate", "Review results", "Player matches", "Confirm", "Import"]) expect(markup).toContain(step);
    expect(markup).toContain("LinkedIn CSV file");
    expect(markup).toContain("Approval gate");
    expect(markup).toContain("Raw CSV rows are parsed for this request and are not retained");
  });

  it("keeps import decisions server-authorized and validates selected Player candidates after preview", () => {
    const actions = readFileSync("app/admin/gtm/actions.ts", "utf8");
    expect(actions).toContain("export async function inspectGtmCsv");
    expect(actions).toContain("await getAuthorizedClient()");
    expect(actions).toContain("parsePlayerMatchDecisions");
    expect(actions).toContain("review?.candidates.find");
    expect(actions).toContain("is no longer valid. Preview the import again.");
  });

  it("supports audited note edits without changing canonical Player records", () => {
    const actions = readFileSync("app/admin/gtm/actions.ts", "utf8");
    const drawer = readFileSync("components/admin/gtm/GtmContactDrawer.tsx", "utf8");
    expect(actions).toContain("export async function editGtmNote");
    expect(actions).toContain('.from("gtm_notes")');
    expect(drawer).toContain("Update note");
    expect(actions).not.toMatch(/\.from\("players"\)\s*\.(?:insert|update|delete)/);
  });
});
