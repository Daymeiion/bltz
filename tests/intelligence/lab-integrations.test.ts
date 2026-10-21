// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/intelligence/lab-server", async () => {
  class IntelligenceAccessError extends Error { constructor(public status: 401 | 403 | 503) { super("intelligence_access"); } }
  return { authorizeIntelligenceLab: mocks.auth, IntelligenceAccessError };
});
import { GET as getty } from "@/app/api/admin/intelligence/getty/route";
import { GET as slackStatus, POST as slack } from "@/app/api/admin/intelligence/share/slack/route";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { firstSentence } from "@/app/admin/intelligence/lab/model";

const ORIGIN = "https://bltz.example";
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GETTY_API_KEY", "");
  vi.stubEnv("SLACK_ACTIVATIONS_WEBHOOK_URL", "");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Getty search route", () => {
  it("rejects non-admins before reading configuration", async () => {
    mocks.auth.mockRejectedValue(new IntelligenceAccessError(403));
    const response = await getty(new Request(`${ORIGIN}/api/admin/intelligence/getty?q=Keith%20Rivers`));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reports an unconfigured connection without calling Getty", async () => {
    const response = await getty(new Request(`${ORIGIN}/api/admin/intelligence/getty?q=Keith%20Rivers`));
    expect(await response.json()).toEqual({ state: "not_configured", images: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns display metadata only and keeps the key server-side", async () => {
    vi.stubEnv("GETTY_API_KEY", "server-secret");
    fetchMock.mockResolvedValue(Response.json({ result_count: 1, images: [{ id: "72137869", title: "Rivers tackle", artist: "Staff", date_created: "2006-10-07T22:00:00", display_sizes: [{ name: "thumb", uri: "https://media.gettyimages.com/id/72137869/thumb.jpg" }, { name: "comp", uri: "javascript:alert(1)" }], raw: "private" }] }));
    const response = await getty(new Request(`${ORIGIN}/api/admin/intelligence/getty?q=Keith%20Rivers`));
    const body = await response.json();
    expect(fetchMock.mock.calls[0][1].headers["Api-Key"]).toBe("server-secret");
    expect(body.images).toEqual([{ id: "72137869", title: "Rivers tackle", caption: null, date: "2006-10-07", artist: "Staff", collection: null, thumb: "https://media.gettyimages.com/id/72137869/thumb.jpg", comp: null, detailUrl: "https://www.gettyimages.com/detail/72137869" }]);
    expect(JSON.stringify(body)).not.toContain("server-secret");
    expect(JSON.stringify(body)).not.toContain("private");
  });
});

describe("Slack share route", () => {
  const post = (text: unknown, origin = ORIGIN) => new Request(`${ORIGIN}/api/admin/intelligence/share/slack`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ text }) });
  it("reports status without exposing the webhook", async () => {
    vi.stubEnv("SLACK_ACTIVATIONS_WEBHOOK_URL", "https://hooks.slack.com/services/T000/B000/secret");
    expect(await (await slackStatus()).json()).toEqual({ state: "ready" });
  });
  it("does not post when no webhook is configured", async () => {
    expect(await (await slack(post("Draft"))).json()).toEqual({ state: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses cross-origin posts", async () => {
    vi.stubEnv("SLACK_ACTIVATIONS_WEBHOOK_URL", "https://hooks.slack.com/services/T000/B000/secret");
    expect((await slack(post("Draft", "https://evil.example"))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("posts bounded text to the configured Slack webhook only", async () => {
    vi.stubEnv("SLACK_ACTIVATIONS_WEBHOOK_URL", "https://hooks.slack.com/services/T000/B000/secret");
    fetchMock.mockResolvedValue(new Response("ok"));
    const response = await slack(post("x".repeat(5000)));
    expect(await response.json()).toEqual({ state: "sent" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://hooks.slack.com/services/T000/B000/secret");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toHaveLength(3000);
  });
  it("ignores webhooks outside Slack", async () => {
    vi.stubEnv("SLACK_ACTIVATIONS_WEBHOOK_URL", "https://attacker.example/hook");
    expect(await (await slack(post("Draft"))).json()).toEqual({ state: "not_configured" });
  });
});

describe("Lab copy helpers", () => {
  it("keeps abbreviations like vs. inside the first sentence", () => {
    expect(firstSentence("The 20-year anniversary of \"USC vs. Washington\" falls on 2026-10-07. Verified evidence follows.")).toBe("The 20-year anniversary of \"USC vs. Washington\" falls on 2026-10-07.");
  });
});
