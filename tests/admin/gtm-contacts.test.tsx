import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GtmContactRow, GtmMetrics } from "@/lib/gtm/server";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/gtm/contacts", useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/app/admin/gtm/actions", () => ({
  addGtmDiscoveryInsight: vi.fn(),
  addGtmNote: vi.fn(),
  archiveGtmContact: vi.fn(),
  commitGtmCsv: vi.fn(),
  createGtmContact: vi.fn(),
  editGtmContact: vi.fn(),
  editGtmNote: vi.fn(),
  inspectGtmCsv: vi.fn(),
  logGtmInteraction: vi.fn(),
  matchGtmContactPlayer: vi.fn(),
  previewGtmCsv: vi.fn(),
  searchGtmPlayers: vi.fn(),
  setGtmNextAction: vi.fn(),
  setGtmPipelineStage: vi.fn(),
  setGtmPriority: vi.fn(),
  setGtmRelationshipIntelligence: vi.fn(),
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
    email: "jordan@example.com",
    phone: null,
    geography: "California",
    currentCompany: "North Coast Athletics",
    currentTitle: "Athletic Director",
    contactType: "enterprise",
    contactTypeOther: null,
    potentialRoles: ["pilot_champion", "decision_maker"],
    relationshipObjective: "customer_discovery",
    relationshipPriority: "high",
    relationshipContext: "Potential university pilot champion.",
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
    pipelineStage: "engaged",
    source: "linkedin_csv",
    linkedinUrl: "https://www.linkedin.com/in/jordan-reed",
    doNotAutomate: true,
    isPriority: true,
    lastInteractionAt: "2026-08-01T12:00:00.000Z",
    nextAction: "Schedule discovery call",
    nextActionAt: "2026-08-20T12:00:00.000Z",
    investorType: null,
    investorRelationshipStage: null,
    whatTheyNeedToSee: null,
    investorThesisFeedback: null,
    historicalSignal: null,
    futureTrigger: null,
    priorOutcome: null,
    relationshipSource: null,
    nextTrigger: "Re-engage after first university pilot",
    personas: ["Enterprise Decision Maker"],
    classificationSource: "deterministic_rules_v1",
    classificationConfidence: 0.96,
    classificationStatus: "auto_classified",
    classificationReasons: ["senior athletics decision-maker title"],
    identityReviewStatus: "clear",
    identityReviewReason: null,
    priorityScoreExplanation: null,
    playerMatch: null,
    notes: [],
    interactions: [],
    discoveries: [],
    ...overrides,
  };
}

const baseFilters: GtmContactFilters = {
  search: "",
  contactType: "all",
  potentialRole: "all",
  relationshipObjective: "all",
  relationshipPriority: "all",
  priorityTier: "all",
  pipelineStage: "all",
  conversationOutcome: "all",
  segment: "all",
  organization: "all",
  sport: "all",
  leagueLevel: "all",
  source: "all",
  doNotAutomate: "all",
  hasPlayerMatch: "all",
  needsFollowUp: "all",
  classificationStatus: "all",
  identityReviewStatus: "all",
  savedView: "All contacts",
};

const metrics: GtmMetrics = {
  generatedAt: "2026-08-24T12:00:00.000Z",
  since: "2026-07-25T12:00:00.000Z",
  totalContacts: 12,
  contactTypeCounts: { enterprise: 5, athlete: 3, multiplier: 2, investor: 2 },
  segmentCounts: { athletic_department: 4 },
  tierAContacts: 3,
  tierBContacts: 4,
  priorityContacts: 5,
  enterpriseContacts: 5,
  athleteContacts: 3,
  multiplierContacts: 2,
  activeConversations: 7,
  contactsNeedingFollowUp: 2,
  discoveryConversations: 4,
  demoCandidates: 2,
  pilotCandidates: 1,
  activePilots: 1,
  conversions: 1,
  playerLinkedContacts: 3,
  discoveryAnalysis: {
    problems: [{ value: "Fragmented athlete media", count: 3 }],
    useCases: [{ value: "Player Locker", count: 2 }],
    features: [{ value: "Archive search", count: 2 }],
    objections: [{ value: "Budget timing", count: 1 }],
    pilotIntent: { yes: 3, no: 1, unknown: 2 },
    willingnessToPay: { yes: 2, no: 1, unknown: 3 },
  },
};

describe("GTM contacts workspace", () => {
  it("searches across identity and organization fields and combines explicit filters", () => {
    const contacts = [
      contact(),
      contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711", displayName: "Morgan Hill", currentCompany: "BLTZ", contactType: "multiplier", priorityTier: "B" }),
    ];

    expect(filterGtmContacts(contacts, { ...baseFilters, search: "north coast", contactType: "enterprise", priorityTier: "A" })).toEqual([contacts[0]]);
  });

  it("combines the operational organization, sport, automation, Player, and follow-up filters", () => {
    const due = contact({ playerMatch: { playerId: "8b148fe2-5e87-4a42-9b69-74341f75854a", playerName: "Jordan Reed", team: "North Coast", position: "QB", level: "college", verified: true } });
    const other = contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711", currentCompany: "BLTZ", sport: "basketball", doNotAutomate: false, nextActionAt: null });
    const now = new Date("2026-08-24T12:00:00.000Z");

    expect(filterGtmContacts([due, other], {
      ...baseFilters,
      organization: "north coast athletics",
      sport: "football",
      leagueLevel: "ncaa",
      doNotAutomate: "yes",
      hasPlayerMatch: "yes",
      needsFollowUp: "yes",
    }, now)).toEqual([due]);
  });

  it("filters investor contacts and non-binary conversation outcomes", () => {
    const investor = contact({
      contactType: "investor",
      investorType: "sports_vc",
      investorRelationshipStage: "milestone_follow_up",
      interactions: [{
        id: "4b102f96-b0d1-4ba2-946c-5890a55aa97c",
        interactionType: "meeting",
        direction: "mutual",
        subject: "Product review",
        summary: null,
        interactionAt: "2026-08-20T12:00:00.000Z",
        outcomes: ["capital", "strategic_insight"],
        nextTrigger: "Reconnect after 250 activated athletes",
        followUpRequired: true,
      }],
    });
    const enterprise = contact({ id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711" });

    expect(filterGtmContacts([investor, enterprise], { ...baseFilters, contactType: "investor", conversationOutcome: "capital" })).toEqual([investor]);
  });

  it("filters relationship intelligence independently from type and pipeline", () => {
    const pilotChampion = contact();
    const advisor = contact({
      id: "1c1ccff9-bfa0-40e7-8654-bbda8d999711",
      potentialRoles: ["advisor"],
      relationshipObjective: "strategic_learning",
      relationshipPriority: "medium",
    });

    expect(filterGtmContacts([pilotChampion, advisor], {
      ...baseFilters,
      potentialRole: "pilot_champion",
      relationshipObjective: "customer_discovery",
      relationshipPriority: "high",
    })).toEqual([pilotChampion]);
  });

  it("renders investor and conversation-outcome filters in the existing workspace", () => {
    const investor = contact({
      contactType: "investor",
      investorType: "sports_vc",
      investorRelationshipStage: "milestone_follow_up",
      whatTheyNeedToSee: "University pilot traction",
      interactions: [{
        id: "4b102f96-b0d1-4ba2-946c-5890a55aa97c",
        interactionType: "meeting",
        direction: "mutual",
        subject: "Product review",
        summary: null,
        interactionAt: "2026-08-20T12:00:00.000Z",
        outcomes: ["capital", "strategic_insight"],
        nextTrigger: "Reconnect after 250 activated athletes",
        followUpRequired: true,
      }],
    });
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "ready", contacts: [investor], generatedAt: "2026-08-24T12:00:00.000Z" }} />);

    expect(markup).toContain("Investor");
    expect(markup).toContain("All conversation outcomes");
    expect(markup).toContain("All potential roles");
    expect(markup).toContain("All relationship objectives");
    expect(markup).toContain("All relationship priorities");
    expect(markup).toContain("Strategic Insight");
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
    expect(markup).toContain("Import CSV");
    expect(markup).toContain("Add contact / player");
  });

  it("keeps every filter inside the constrained 1024px admin workspace", () => {
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "ready", contacts: [contact()], generatedAt: "2026-08-24T12:00:00.000Z" }} />);

    expect(markup).toContain("md:grid-cols-2");
    expect(markup).toContain("lg:grid-cols-3");
    expect(markup).toContain("xl:grid-cols-[minmax(14rem,1fr)_12rem_repeat(4,minmax(8rem,10rem))]");
    expect(markup).not.toContain("lg:grid-cols-[minmax(16rem,1fr)_14rem_repeat(3,minmax(9rem,12rem))]");
    expect(markup).toContain("Pipeline stage");
    expect(markup).toContain("More filters");
    expect(markup).toContain("All organizations");
    expect(markup).toContain("Any Player-match status");
    expect(markup).toContain("Actions");
  });

  it("renders reliable pipeline and discovery instrumentation", () => {
    const markup = renderToStaticMarkup(<GtmContactsWorkspace data={{ state: "ready", contacts: [contact()], generatedAt: metrics.generatedAt }} metrics={metrics} />);

    expect(markup).toContain("GTM metrics");
    expect(markup).toContain("Active conversations");
    expect(markup).toContain("Player-linked");
    expect(markup).toContain("Fragmented athlete media");
    expect(markup).toContain("Would pilot · Yes");
  });
});
