// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "11111111-1111-4111-8111-111111111111";
const PLAYER = "33333333-3333-4333-8333-333333333333";
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), roster: vi.fn(), facts: vi.fn(), share: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/enterprise-crm/workspace-access", () => ({ authorizeWorkspaceRequest: mocks.authorize }));
vi.mock("@/lib/enterprise-crm/pilot/former-players", () => ({ loadSchoolRoster: mocks.roster }));
vi.mock("@/lib/enterprise-crm/pilot/briefs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/briefs")>()),
  loadBriefFacts: mocks.facts, shareBrief: mocks.share,
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { dismissalKey, isMomentDismissed, isSignalDismissed, stableSignalKey, type Dismissal } from "@/lib/enterprise-crm/pilot/dismissals-shared";
import { buildBriefFacts } from "@/lib/enterprise-crm/pilot/brief-facts";
import { briefShareInput } from "@/lib/enterprise-crm/pilot/briefs-shared";
import { hashBriefToken } from "@/lib/enterprise-crm/pilot/briefs";
import { previewActivations, previewAthleteFile, previewMedia } from "@/components/organization/pilot/preview-data";
import { POST as shareRoute } from "@/app/api/organization/[organizationId]/briefs/route";

const dismissal = (values: Partial<Dismissal>): Dismissal => ({ id: "d1", playerId: PLAYER, targetType: "signal", targetKey: "x", scope: "always", label: null, reason: null, createdAt: "2026-11-10T00:00:00Z", ...values });
const KEY = `historical_anniversary:v1:${PLAYER}:m1:2026-11-18`;

describe("dismissals", () => {
  it("hides one year with the dated key and every year with the stable key", () => {
    expect(stableSignalKey(KEY)).toBe(`historical_anniversary:v1:${PLAYER}:m1`);
    expect(dismissalKey(KEY, "this_year")).toBe(KEY);
    const thisYear = [dismissal({ targetKey: dismissalKey(KEY, "this_year"), scope: "this_year" })];
    expect(isSignalDismissed({ key: KEY, momentId: "m1" }, thisYear)).not.toBeNull();
    expect(isSignalDismissed({ key: KEY.replace("2026", "2027"), momentId: "m1" }, thisYear)).toBeNull();
    const always = [dismissal({ targetKey: dismissalKey(KEY, "always") })];
    expect(isSignalDismissed({ key: KEY.replace("2026", "2027"), momentId: "m1" }, always)).not.toBeNull();
  });

  it("hides a dismissed Moment and the signals it drives", () => {
    const moment = [dismissal({ targetType: "moment", targetKey: "m1" })];
    expect(isMomentDismissed("m1", moment)).not.toBeNull();
    expect(isSignalDismissed({ key: KEY, momentId: "m1" }, moment)).not.toBeNull();
    expect(isSignalDismissed({ key: "birthday:v1:x:athlete:2027-02-14", momentId: null }, moment)).toBeNull();
  });
});

describe("brief facts", () => {
  const file = previewAthleteFile("p1")!;
  const sources = {
    schoolName: "Cal Athletics", origin: "https://bltz.me", file, activations: previewActivations.filter((row) => row.playerId === "p1"),
    reach: [{ platform: "instagram" as const, handle: "@marcushale", followers: 84200, recordedAt: "2026-10-30T12:00:00Z" }],
    media: previewMedia.p1, schoolSignals: [], dismissals: [] as Dismissal[], now: new Date("2026-11-02T12:00:00Z"),
  };

  it("states reach, brands, Locker placements and what is coming up, from the workspace only", () => {
    const facts = buildBriefFacts({ ...sources, partners: [{ name: "Acme", note: null }, { name: "hale performance training", note: null }] });
    expect(facts.athlete).toMatchObject({ name: "Marcus Hale", lockerUrl: "https://bltz.me/player/demo-player" });
    expect(facts.reach.totalFollowers).toBe(84200);
    expect(facts.brands.map((brand) => brand.name)).toEqual(["Hale Performance Training", "Acme"]);
    expect(facts.channels.locker.length).toBe(5);
    expect(facts.channels.planned.map((row) => row.title)).toEqual(["10 years since his first career touchdown"]);
    expect(JSON.stringify(facts)).not.toContain("@halefitness.example");
  });

  it("leaves out unverified and dismissed Moments, and dismissed signals", () => {
    const facts = buildBriefFacts({ ...sources, dismissals: [dismissal({ targetType: "moment", targetKey: "p1-m1" })] });
    expect(facts.highlights.map((row) => row.title)).toEqual(["Conference championship game"]);
    expect(facts.channels.upcoming.map((row) => row.headline)).not.toContain("10 years since his first career touchdown");
  });
});

describe("sharing a brief", () => {
  const context = { userId: "u1", organization: { id: ORG, name: "Cal Athletics", organizationType: "school", status: "approved", schoolId: null }, access: { scope: "organization", membershipId: "m1", role: "member" } };
  const body = {
    playerId: PLAYER, recipient: { brandName: "Acme", contactName: null, contactEmail: "pat@acme.com", goal: null, budget: null },
    narrative: { headline: "Marcus × Acme", summary: "Intro.", fit: "Fit.", ideas: [] }, partners: [], expiresInDays: 30, athleteConsent: true,
  };
  const post = (payload: unknown) => shareRoute(new Request(`https://bltz.me/api/organization/${ORG}/briefs`, { method: "POST", headers: { origin: "https://bltz.me", "Content-Type": "application/json" }, body: JSON.stringify(payload) }), { params: Promise.resolve({ organizationId: ORG }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, context });
    mocks.roster.mockResolvedValue({ state: "ready", players: [{ id: PLAYER, name: "Marcus Hale" }] });
    mocks.facts.mockResolvedValue({ generatedAt: "x" });
    mocks.share.mockResolvedValue({ id: "b1", token: "t".repeat(32), expiresAt: "2026-12-10T00:00:00Z" });
  });

  it("requires the athlete's approval", () => {
    expect(briefShareInput.safeParse({ ...body, athleteConsent: false }).success).toBe(false);
    expect(briefShareInput.safeParse(body).success).toBe(true);
  });

  it("re-gathers the facts on the server and returns the link once", async () => {
    const response = await post(body);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ url: `https://bltz.me/brief/${"t".repeat(32)}` });
    expect(mocks.facts).toHaveBeenCalledWith(context, PLAYER, "https://bltz.me", []);
    expect(mocks.share.mock.calls[0][3]).toEqual({ generatedAt: "x" });
  });

  it("refuses another school's player and a missing approval", async () => {
    mocks.roster.mockResolvedValue({ state: "ready", players: [] });
    expect((await post(body)).status).toBe(404);
    expect((await post({ ...body, athleteConsent: false })).status).toBe(400);
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it("stores only a hash of the token", () => {
    expect(hashBriefToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashBriefToken("abc")).not.toContain("abc");
  });
});
