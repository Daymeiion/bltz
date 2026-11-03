// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  roster: vi.fn(),
  createActivation: vi.fn(),
  createLaunch: vi.fn(),
  recordVisit: vi.fn(),
  verifyUpload: vi.fn(),
  createUploadTicket: vi.fn(),
}));

vi.mock("@/lib/enterprise-crm/workspace-access", () => ({ authorizeWorkspaceRequest: mocks.authorize }));
vi.mock("@/lib/enterprise-crm/pilot/former-players", () => ({ loadSchoolRoster: mocks.roster }));
vi.mock("@/lib/enterprise-crm/pilot/activations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/activations")>()),
  createActivation: mocks.createActivation,
  recordActivationVisit: mocks.recordVisit,
}));
vi.mock("@/lib/enterprise-crm/pilot/launches", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/launches")>()),
  createLaunch: mocks.createLaunch,
}));
vi.mock("@/lib/enterprise-crm/pilot/media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/media")>()),
  verifyUpload: mocks.verifyUpload,
  createUploadTicket: mocks.createUploadTicket,
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { POST as createActivationRoute } from "@/app/api/organization/[organizationId]/activations/route";
import { POST as launchRoute } from "@/app/api/organization/[organizationId]/launches/route";
import { GET as goRoute } from "@/app/api/go/[activationId]/route";
import { POST as uploadRoute } from "@/app/api/organization/[organizationId]/media-uploads/route";

const ORG = "20000000-0000-4000-8000-000000000002";
const OWN_PLAYER = "30000000-0000-4000-8000-000000000003";
const OTHER_PLAYER = "40000000-0000-4000-8000-000000000004";
const context = { userId: "u1", organization: { id: ORG, name: "Westlake", organizationType: "school", status: "approved", schoolId: null }, access: { scope: "organization", membershipId: "m1", role: "viewer" } };

function post(url: string, body: unknown, origin = "http://localhost") {
  return new Request(url, { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
}
const params = { params: Promise.resolve({ organizationId: ORG }) };

describe("pilot workspace APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, context, grants: {} });
    mocks.roster.mockResolvedValue({ state: "ready", players: [{ id: OWN_PLAYER }] });
    mocks.createActivation.mockResolvedValue({ id: "a1" });
    mocks.createLaunch.mockResolvedValue({ id: "l1" });
  });

  it("creates an activation for the school's own player with activation.manage", async () => {
    const response = await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OWN_PLAYER, kind: "post", title: "Throwback" }), params);
    expect(response.status).toBe(201);
    expect(mocks.authorize).toHaveBeenCalledWith(ORG, "activation.manage");
    expect(mocks.createActivation).toHaveBeenCalledWith(ORG, "u1", expect.objectContaining({ playerId: OWN_PLAYER, additionalPlayerIds: [] }), expect.any(Map));
  });

  it("refuses to feature another school's player alongside the lead", async () => {
    const response = await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OWN_PLAYER, additionalPlayerIds: [OTHER_PLAYER], kind: "event", title: "Reunion" }), params);
    expect(response.status).toBe(404);
    expect(mocks.createActivation).not.toHaveBeenCalled();
  });

  it("refuses another school's player without revealing it exists", async () => {
    const response = await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OTHER_PLAYER, kind: "post", title: "Throwback" }), params);
    expect(response.status).toBe(404);
    expect(mocks.createActivation).not.toHaveBeenCalled();
  });

  it("refuses cross-site writes before authorizing", async () => {
    const response = await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OWN_PLAYER, kind: "post", title: "x" }, "https://evil.example"), params);
    expect(response.status).toBe(403);
    expect(mocks.authorize).not.toHaveBeenCalled();
  });

  it.each([[401, 401], [403, 403], [404, 404]])("passes through an authorization failure (%s)", async (status, expected) => {
    mocks.authorize.mockResolvedValueOnce({ ok: false, status });
    const response = await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OWN_PLAYER, kind: "post", title: "x" }), params);
    expect(response.status).toBe(expected);
    expect(mocks.createActivation).not.toHaveBeenCalled();
  });

  it("rejects unknown fields and non-https media links", async () => {
    expect((await createActivationRoute(post(`http://localhost/api/organization/${ORG}/activations`, { playerId: OWN_PLAYER, kind: "post", title: "x", organizationId: "other" }), params)).status).toBe(400);
    const launch = await launchRoute(post(`http://localhost/api/organization/${ORG}/launches`, { playerName: "Chris Okafor", media: [{ kind: "highlight", title: "Clip", url: "http://insecure.example/clip" }] }), params);
    expect(launch.status).toBe(400);
  });

  it("launches a new player without a roster check, and an existing one only from the school's roster", async () => {
    expect((await launchRoute(post(`http://localhost/api/organization/${ORG}/launches`, { playerName: "Chris Okafor", media: [{ kind: "business", title: "Okafor Realty", occurredOn: "2019-11-12" }] }), params)).status).toBe(201);
    expect((await launchRoute(post(`http://localhost/api/organization/${ORG}/launches`, { playerId: OTHER_PLAYER, playerName: "Someone" }), params)).status).toBe(404);
  });

  it("issues upload links only for the school's players and within size limits", async () => {
    mocks.createUploadTicket.mockResolvedValue({ bucket: "organization-athlete-media", path: "p", token: "t" });
    const url = `http://localhost/api/organization/${ORG}/media-uploads`;
    expect((await uploadRoute(post(url, { playerId: OWN_PLAYER, mime: "video/mp4", size: 1_000_000 }), params)).status).toBe(200);
    expect((await uploadRoute(post(url, { playerId: OTHER_PLAYER, mime: "video/mp4", size: 1_000_000 }), params)).status).toBe(404);
    const big = await uploadRoute(post(url, { playerId: OWN_PLAYER, mime: "image/png", size: 40 * 1024 * 1024 }), params);
    expect(big.status).toBe(400);
    expect(await big.json()).toEqual({ state: "too_large" });
    expect((await uploadRoute(post(url, { playerId: OWN_PLAYER, mime: "application/pdf", size: 10 }), params)).status).toBe(400);
  });

  it("accepts attached media only when uploads landed and Getty items name a Getty asset", async () => {
    const url = `http://localhost/api/organization/${ORG}/activations`;
    const base = { playerId: OWN_PLAYER, kind: "video", title: "Highlights" };
    const upload = { kind: "highlight", title: "Clip", source: "upload", storagePath: `${ORG}/${OWN_PLAYER}/${OWN_PLAYER}.mp4` };
    mocks.verifyUpload.mockResolvedValueOnce(false);
    expect((await createActivationRoute(post(url, { ...base, media: [upload] }), params)).status).toBe(400);
    mocks.verifyUpload.mockResolvedValueOnce(true);
    expect((await createActivationRoute(post(url, { ...base, media: [upload] }), params)).status).toBe(201);
    expect(mocks.verifyUpload).toHaveBeenLastCalledWith(ORG, OWN_PLAYER, upload.storagePath);

    const getty = { kind: "image", title: "Photo", source: "getty", externalId: "72137869", url: "https://www.gettyimages.com/detail/72137869" };
    expect((await createActivationRoute(post(url, { ...base, media: [getty] }), params)).status).toBe(201);
    expect((await createActivationRoute(post(url, { ...base, media: [{ ...getty, url: "https://evil.example/detail/72137869" }] }), params)).status).toBe(400);
    expect((await createActivationRoute(post(url, { ...base, media: [{ ...getty, source: "upload" }] }), params)).status).toBe(400);
  });

  it("redirects a tracked link to the Locker and falls back home for unknown links", async () => {
    mocks.recordVisit.mockResolvedValueOnce("/player/marcus-hale").mockResolvedValueOnce(null);
    const hit = await goRoute(new Request("http://localhost/api/go/a1"), { params: Promise.resolve({ activationId: "a1" }) });
    expect(hit.status).toBe(302);
    expect(hit.headers.get("location")).toBe("http://localhost/player/marcus-hale");
    const miss = await goRoute(new Request("http://localhost/api/go/nope"), { params: Promise.resolve({ activationId: "nope" }) });
    expect(miss.headers.get("location")).toBe("http://localhost/");
  });
});
