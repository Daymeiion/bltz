import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GtmContactRow } from "@/lib/gtm/server";

vi.mock("@/app/admin/gtm/actions", () => ({
  addGtmNote: vi.fn(),
  logGtmInteraction: vi.fn(),
}));

import {
  filterGtmContacts,
  GtmContactsWorkspace,
  sortGtmContacts,
  type GtmContactFilters,
} from "@/components/admin/gtm/GtmContactsWorkspace";

function contact(overrides: Partial<GtmContactRow> = {}): GtmContactRow {
  return {
    id: "8b148fe2-5e87-4a42-9b69-74341f75854a",
    displayName: "Jordan Reed",
    firstName: "Jordan",
    lastName: "Reed",
    currentCompany: "North Coast Athletics",
    currentTitle: "Athletic Director",
    contactType: "enterprise",
    segment: "athletic_department",
    sport: "football",
    leagueLevel: "ncaa",
    relationshipStrength: 4,
    networkLeverage: 5,
    bltzRelevance: 5,
    buyingAuthority: 4,
    timingScore: 3,
    priorityScore: 86,
    priorityTier: "A",
    pipelineStage: "qualified",
    source: "linkedin_csv",
    linkedinUrl: "https://www.linkedin.com/in/jordan-reed",
    doNotAutomate: true,
    isPriority: true,
    lastInteractionAt: "2026-08-01T12:00:00.000Z",
    nextAction: "Schedule discovery call",
    nextActionAt: "2026-08-20T12:00:00.000Z",
    playerMatch: null,
    notes: [],
    interactions: [],
    ...overrides,
  };
}

const baseFilters: GtmContactFilters = {
  search: "",
  contactType: "all",
  priorityTier: "all",
  pipelineStage: "all",
  savedView: "All contacts",
};

describe("GTM contacts workspace", () => {
  it("searches across identity and organization fields and combines explicit filters", () => {
    const contacts = [
      contact(),
      contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711", displayName: "Morgan Hill", currentCompany: "BLTZ", contactType: "multiplier", priorityTier: "B" }),
    ];

    expect(filterGtmContacts(contacts, { ...baseFilters, search: "north coast", contactType: "enterprise", priorityTier: "A" })).toEqual([contacts[0]]);
  });

  it("supports the built-in follow-up and relationship-intelligence views", () => {
    const due = contact();
    const future = contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711", displayName: "Morgan Hill", nextActionAt: "2026-09-10T12:00:00.000Z", networkLeverage: 2 });
    const now = new Date("2026-08-24T12:00:00.000Z");

    expect(filterGtmContacts([due, future], { ...baseFilters, savedView: "Needs Follow-Up" }, now)).toEqual([due]);
    expect(filterGtmContacts([due, future], { ...baseFilters, savedView: "High Network Leverage" }, now)).toEqual([due]);
  });

  it("sorts priority scores while leaving unscored contacts at the end", () => {
    const sorted = sortGtmContacts([
      contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711", priorityScore: null }),
      contact({ id: "719b97ef-ac66-4ca4-9823-28fcac62f5c1", priorityScore: 42 }),
      contact({ id: "8b148fe2-5e87-4a42-9b69-74341f75854a", priorityScore: 86 }),
    ], "priorityScore", "desc");

    expect(sorted.map((item) => item.priorityScore)).toEqual([86, 42, null]);
  });

  it("renders a migration-aware empty state without fabricated contacts", () => {
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "not_configured", contacts: [], generatedAt: "2026-08-24T12:00:00.000Z" }} />);

    expect(markup).toContain("GTM data is not configured");
    expect(markup).toContain("Deploy the approved GTM migration");
    expect(markup).not.toContain("Jordan Reed");
  });

  it("renders private relationship fields and explicit automation protection", () => {
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "ready", contacts: [contact()], generatedAt: "2026-08-24T12:00:00.000Z" }} />);

    expect(markup).toContain("Jordan Reed");
    expect(markup).toContain("North Coast Athletics");
    expect(markup).toContain("Schedule discovery call");
    expect(markup).toContain("Do not automate");
    expect(markup).toContain("Private data remains within the authenticated Admin boundary");
  });

  it("keeps every filter inside the constrained 1024px admin workspace", () => {
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "ready", contacts: [contact()], generatedAt: "2026-08-24T12:00:00.000Z" }} />);

    expect(markup).toContain("md:grid-cols-2");
    expect(markup).toContain("lg:grid-cols-3");
    expect(markup).toContain("xl:grid-cols-[minmax(14rem,1fr)_12rem_repeat(3,minmax(8rem,10rem))]");
    expect(markup).not.toContain("lg:grid-cols-[minmax(16rem,1fr)_14rem_repeat(3,minmax(9rem,12rem))]");
    expect(markup).toContain("Pipeline stage");
  });
});
