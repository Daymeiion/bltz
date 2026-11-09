// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "11111111-1111-4111-8111-111111111111";
const ACTIVATION = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  activation: vi.fn(),
  slack: vi.fn(),
  teams: vi.fn(),
  wordpress: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/enterprise-crm/workspace-access", () => ({ authorizeWorkspaceRequest: mocks.authorize }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.activation }) }) }) }) }),
}));
vi.mock("@/lib/enterprise-crm/pilot/integrations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/enterprise-crm/pilot/integrations")>()),
  sendToSlack: mocks.slack, sendToTeams: mocks.teams, createWordPressDraft: mocks.wordpress,
}));

import { integrationInput, isTeamsWebhook, publicSiteUrl } from "@/lib/enterprise-crm/pilot/integrations";
import { POST as shareRoute } from "@/app/api/organization/[organizationId]/share/route";

const context = { userId: "u1", organization: { id: ORG, name: "Cal Athletics", organizationType: "school", status: "approved", schoolId: null }, access: { scope: "organization", membershipId: "m1", role: "member" } };
const share = (body: unknown, origin = "https://bltz.me") => shareRoute(
  new Request(`https://bltz.me/api/organization/${ORG}/share`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  { params: Promise.resolve({ organizationId: ORG }) },
);

describe("connection links", () => {
  it("accepts only Slack incoming-webhook links for Slack", () => {
    expect(integrationInput.safeParse({ kind: "slack", webhookUrl: "https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXXXXXXXXXX" }).success).toBe(true);
    expect(integrationInput.safeParse({ kind: "slack", webhookUrl: "https://evil.example/services/T000/B000/XXXX" }).success).toBe(false);
  });

  it("accepts Teams webhook and Workflows links, nothing else", () => {
    expect(isTeamsWebhook("https://cal.webhook.office.com/webhookb2/abc")).toBe(true);
    // Workflows links include :443, which is the https default and allowed.
    expect(isTeamsWebhook("https://prod-12.westus.logic.azure.com:443/workflows/abc")).toBe(true);
    expect(isTeamsWebhook("https://prod-12.westus.logic.azure.com:8443/workflows/abc")).toBe(false);
    expect(isTeamsWebhook("https://prod-12.westus.logic.azure.com/workflows/abc/triggers/manual/paths/invoke?sig=x")).toBe(true);
    expect(isTeamsWebhook("http://cal.webhook.office.com/x")).toBe(false);
    expect(isTeamsWebhook("https://webhook.office.com.evil.example/x")).toBe(false);
  });

  it("keeps WordPress sites public: https, a real domain, no IPs, ports or internal names", () => {
    expect(publicSiteUrl("https://news.calbears.com/")).toBe("https://news.calbears.com");
    for (const bad of ["http://news.calbears.com", "https://127.0.0.1", "https://[::1]", "https://localhost", "https://intranet.local", "https://site.com:8443", "https://user:pw@site.com"]) {
      expect(publicSiteUrl(bad)).toBeNull();
    }
    expect(integrationInput.safeParse({ kind: "wordpress", siteUrl: "https://news.calbears.com", username: "web", appPassword: "abcd efgh ijkl mnop qrst uvwx" }).success).toBe(true);
    expect(integrationInput.safeParse({ kind: "wordpress", siteUrl: "https://news.calbears.com", username: "web", appPassword: "hunter2" }).success).toBe(false);
  });
});

describe("sending an activation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, context });
    mocks.activation.mockResolvedValue({ data: { id: ACTIVATION, title: "Dante looks back" } });
  });

  it("sends the edited note to the school's Slack channel", async () => {
    mocks.slack.mockResolvedValue({ state: "sent" });
    const response = await share({ destination: "slack", activationId: ACTIVATION, message: "Article: Dante looks back" });
    expect(response.status).toBe(200);
    expect(mocks.slack).toHaveBeenCalledWith(ORG, "Article: Dante looks back");
  });

  it("builds the WordPress draft as escaped HTML and only links back to BLTZ", async () => {
    mocks.wordpress.mockResolvedValue({ state: "sent" });
    const post = { headline: "Dante looks back", paragraphs: ["<script>x</script>"], cta: "Visit Dante's fan Locker", link: "https://bltz.me/api/go/abc" };
    expect((await share({ destination: "wordpress", activationId: ACTIVATION, post })).status).toBe(200);
    expect(mocks.wordpress).toHaveBeenCalledWith(ORG, "Dante looks back", '<p>&lt;script&gt;x&lt;/script&gt;</p>\n<p><a href="https://bltz.me/api/go/abc">Visit Dante\'s fan Locker</a></p>');
    expect((await share({ destination: "wordpress", activationId: ACTIVATION, post: { ...post, link: "https://evil.example/x" } })).status).toBe(400);
  });

  it("refuses cross-site requests, other schools' activations and tools that are not connected", async () => {
    expect((await share({ destination: "slack", activationId: ACTIVATION, message: "x" }, "https://evil.example")).status).toBe(403);
    mocks.activation.mockResolvedValueOnce({ data: null });
    expect((await share({ destination: "slack", activationId: ACTIVATION, message: "x" })).status).toBe(404);
    mocks.slack.mockResolvedValue({ state: "not_connected" });
    expect((await share({ destination: "slack", activationId: ACTIVATION, message: "x" })).status).toBe(409);
    expect(mocks.teams).not.toHaveBeenCalled();
  });
});
