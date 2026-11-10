// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isInternalAdmin: vi.fn(), getUser: vi.fn(), decide: vi.fn(), submit: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rbac", () => ({ isInternalAdmin: mocks.isInternalAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/enterprise-crm/pilot/applications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/applications")>()),
  decideApplication: mocks.decide, submitApplication: mocks.submit,
}));

import { applicationInput, decisionInput } from "@/lib/enterprise-crm/pilot/applications";
import { addAthleteInput, careerYears, collegeParts, inviteInput, matchesCollege } from "@/lib/enterprise-crm/pilot/roster-shared";
import { inviteEmailText, validJoinUrl } from "@/lib/enterprise-crm/pilot/invite-email";
import { hashInviteToken } from "@/lib/enterprise-crm/pilot/invites";
import { PATCH as decideRoute } from "@/app/api/admin/pilot-applications/[applicationId]/route";
import { POST as applyRoute } from "@/app/api/pilot/apply/route";

const APPLICATION = "55555555-5555-4555-8555-555555555555";
const TOKEN = "a".repeat(32);

describe("pilot application", () => {
  const base = { organizationKind: "school_athletics", organizationName: "California Athletics", collegeDirectoryId: 12, applicantName: "Pat Lee", applicantEmail: "Pat@Berkeley.edu", applicantTitle: "", message: "" };

  it("needs a college for schools but not for agencies, and lowercases the email", () => {
    expect(applicationInput.parse(base).applicantEmail).toBe("pat@berkeley.edu");
    expect(applicationInput.safeParse({ ...base, collegeDirectoryId: null }).success).toBe(false);
    expect(applicationInput.safeParse({ ...base, organizationKind: "nil_agency", collegeDirectoryId: null }).success).toBe(true);
  });

  it("applies with the signed-in account's email, and quietly drops bots", async () => {
    const post = (body: unknown) => applyRoute(new Request("https://bltz.me/api/pilot/apply", { method: "POST", headers: { origin: "https://bltz.me", "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    mocks.getUser.mockResolvedValue({ data: { user: { email: "Dante@bltz.me" } } });
    mocks.submit.mockResolvedValue({ state: "received" });
    expect((await post(base)).status).toBe(201);
    expect(mocks.submit.mock.calls[0][0].applicantEmail).toBe("dante@bltz.me");
    mocks.submit.mockClear();
    expect((await post({ ...base, website: "" })).status).toBe(201);
    expect(applicationInput.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });
});

describe("approving an application", () => {
  const patch = (body: unknown, origin = "https://bltz.me") => decideRoute(
    new Request(`https://bltz.me/api/admin/pilot-applications/${APPLICATION}`, { method: "PATCH", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ applicationId: APPLICATION }) },
  );
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isInternalAdmin.mockResolvedValue(true);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("is for BLTZ admins on the same site only", async () => {
    expect((await patch({ decision: "approve" }, "https://evil.example")).status).toBe(403);
    mocks.isInternalAdmin.mockResolvedValue(false);
    expect((await patch({ decision: "approve" })).status).toBe(403);
    expect(mocks.decide).not.toHaveBeenCalled();
  });

  it("passes the chosen master-list college and reports an unconfirmed applicant", async () => {
    mocks.decide.mockResolvedValue({ state: "approved", rosterAdded: 412 });
    const ok = await patch({ decision: "approve", masterListCollege: " California " });
    expect(ok.status).toBe(200);
    expect(mocks.decide).toHaveBeenCalledWith(APPLICATION, "admin-1", { decision: "approve", masterListCollege: "California" });
    mocks.decide.mockResolvedValue({ state: "applicant_not_confirmed" });
    expect((await patch({ decision: "approve" })).status).toBe(409);
    expect(decisionInput.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});

describe("roster from the master list", () => {
  it("matches a college exactly, including players with several colleges", () => {
    expect(collegeParts("California; Oregon")).toEqual(["California", "Oregon"]);
    expect(matchesCollege("California; Oregon", "california")).toBe(true);
    expect(matchesCollege("Southern California", "California")).toBe(false);
    expect(matchesCollege(null, "California")).toBe(false);
  });

  it("shows career years", () => {
    expect(careerYears(2007, 2011)).toBe("2007–2011");
    expect(careerYears(2007, 2007)).toBe("2007");
    expect(careerYears(null, 2011)).toBeNull();
  });

  it("validates added players and invites", () => {
    expect(addAthleteInput.parse({ name: " Sam Ortega ", email: "" })).toMatchObject({ name: "Sam Ortega", email: null });
    expect(addAthleteInput.safeParse({ name: "S" }).success).toBe(false);
    expect(inviteInput.safeParse({ athleteId: APPLICATION, channel: "sms" }).success).toBe(false);
    expect(inviteInput.parse({ athleteId: APPLICATION, channel: "email", email: "Sam@Example.com" }).email).toBe("sam@example.com");
  });
});

describe("invite links and email", () => {
  it("only emails links to a BLTZ join page", () => {
    const production = { NODE_ENV: "production" };
    expect(validJoinUrl(`https://bltz.me/join/${TOKEN}`, production)).toBe(true);
    expect(validJoinUrl(`https://evil.example/join/${TOKEN}`, production)).toBe(false);
    expect(validJoinUrl(`https://bltz.me/join/${TOKEN}?next=x`, production)).toBe(false);
    expect(validJoinUrl(`http://localhost:3010/join/${TOKEN}`, production)).toBe(false);
    expect(validJoinUrl(`http://localhost:3010/join/${TOKEN}`, { NODE_ENV: "development" })).toBe(true);
  });

  it("names the school and the player, and stores only a hash of the token", () => {
    const message = inviteEmailText({ athleteName: "Sam Ortega", organizationName: "California Athletics", joinUrl: `https://bltz.me/join/${TOKEN}` });
    expect(message.subject).toBe("California Athletics invited you to claim your BLTZ Locker");
    expect(message.text).toContain("Hi Sam,");
    expect(message.text).toContain(`https://bltz.me/join/${TOKEN}`);
    expect(hashInviteToken(TOKEN)).toMatch(/^[0-9a-f]{64}$/);
  });
});
