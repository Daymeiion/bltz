// @vitest-environment node

import { createHmac, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { trackProductEvent } from "@/lib/analytics/client";

const createClient = vi.fn(async () => ({
  auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

const enabled = process.env.RUN_LIVE_ANALYTICS_TESTS === "1";
const expectedProjectRef = process.env.BLTZ_EXPECTED_SUPABASE_PROJECT_REF;
const runId = randomUUID();
const runToken = runId.replaceAll("-", "");
const athleteId = randomUUID();
const athleteSlug = `qa-analytics-${runToken}`;
const validEventId = randomUUID();
const validOccurredAt = new Date().toISOString();
const createdEventIds = new Set<string>([validEventId]);
const touchedBucketKeys = new Set<string>();
let athleteCreated = false;
const proof = {
  projectRef: "",
  runId,
  athleteId,
  athleteSlug,
  clientEventId: validEventId,
  firstStatus: 0,
  duplicateStatus: 0,
  duplicate: false,
  storedRows: 0,
  timestampPreserved: false,
  sourceSpoofStatus: 0,
  athleteMismatchStatus: 0,
  permanentTransportCalls: 0,
  sessionLimitStatus: 0,
  otherSessionStatus: 0,
  networkProfileLimitStatus: 0,
  networkLimitStatus: 0,
  otherNetworkStatus: 0,
  cleanup: { athleteRows: -1, eventRows: -1, bucketRows: -1 },
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function serviceHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("apikey", required("SUPABASE_SERVICE_ROLE_KEY"));
  headers.set("content-type", "application/json");
  return headers;
}

async function stagingRest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${required("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: serviceHeaders(init?.headers),
  });
}

function rateHash(kind: string, value: string): string {
  return createHmac("sha256", required("SUPABASE_SERVICE_ROLE_KEY"))
    .update(`analytics-rate-limit:v1:${kind}:${value}`)
    .digest("hex");
}

function trackExpectedBuckets(headers: Headers, body: Record<string, unknown>): void {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
  const address = headers.get("x-vercel-forwarded-for")
    ?? headers.get("x-forwarded-for")
    ?? headers.get("x-real-ip");
  if (sessionId) touchedBucketKeys.add(rateHash("session", sessionId));
  if (!address) return;

  const normalizedAddress = address.split(",", 1)[0]?.trim();
  const profile = [
    headers.get("user-agent") ?? "unknown-agent",
    headers.get("accept-language") ?? "unknown-language",
    headers.get("sec-ch-ua-platform") ?? "unknown-platform",
  ].join("\u001f");
  const day = new Date().toISOString().slice(0, 10);
  touchedBucketKeys.add(rateHash("network-profile", `${day}:${normalizedAddress}:${profile}`));
  touchedBucketKeys.add(rateHash("network-day", `${day}:${normalizedAddress}`));
}

async function routeRequest(
  body: Record<string, unknown>,
  headersInit?: HeadersInit,
): Promise<Response> {
  const headers = new Headers(headersInit);
  headers.set("content-type", "application/json");
  trackExpectedBuckets(headers, body);
  const { POST } = await import("@/app/api/analytics/events/route");
  return POST(new NextRequest("http://localhost/api/analytics/events", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }));
}

function publicEnvelope(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    eventId: randomUUID(),
    eventName: "locker_viewed",
    occurredAt: new Date().toISOString(),
    page: `/player/${athleteSlug}`,
    athleteSlug,
    sessionId: randomUUID(),
    properties: { qa_run: runId },
    ...overrides,
  };
}

async function assertRowsAbsent(table: string, query: string): Promise<void> {
  const response = await stagingRest(`${table}?select=*&${query}`);
  expect(response.status, `${table} preflight`).toBe(200);
  expect(await response.json(), `${table} preflight`).toEqual([]);
}

async function countRows(table: string, query: string): Promise<number> {
  const response = await stagingRest(`${table}?select=*&${query}`);
  expect(response.status, `${table} count`).toBe(200);
  return (await response.json() as unknown[]).length;
}

async function deleteInChunks(table: string, column: string, values: string[]): Promise<void> {
  for (let index = 0; index < values.length; index += 40) {
    const encoded = values.slice(index, index + 40).map((value) => `"${value}"`).join(",");
    const response = await stagingRest(`${table}?${column}=in.(${encoded})`, {
      method: "DELETE",
      headers: { prefer: "return=representation" },
    });
    expect(response.status, `${table} cleanup`).toBe(200);
  }
}

async function waitForFreshRateWindow(): Promise<void> {
  const secondsIntoWindow = Math.floor(Date.now() / 1000) % 60;
  if (secondsIntoWindow <= 5) return;
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, (61 - secondsIntoWindow) * 1000);
  });
}

describe.skipIf(!enabled)("live staging analytics ingestion proof", () => {
  beforeAll(async () => {
    const target = new URL(required("NEXT_PUBLIC_SUPABASE_URL"));
    expect(target.hostname.split(".", 1)[0]).toBe(expectedProjectRef);
    proof.projectRef = target.hostname.split(".", 1)[0] ?? "";
    expect(required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY")).toMatch(/^sb_publishable_/);
    expect(required("SUPABASE_SERVICE_ROLE_KEY")).toMatch(/^sb_secret_/);

    await assertRowsAbsent("players", `or=(id.eq.${athleteId},slug.eq.${athleteSlug})`);
    await assertRowsAbsent("analytics_events", `client_event_id=eq.${validEventId}`);
    console.info(`QA preflight clear: run=${runId} athlete=${athleteId} slug=${athleteSlug}`);

    const createResponse = await stagingRest("players", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        id: athleteId,
        slug: athleteSlug,
        name: `QA Analytics ${runToken.slice(0, 8)}`,
        full_name: `QA Analytics ${runToken.slice(0, 8)}`,
        visibility: true,
        is_public: true,
      }),
    });
    expect(createResponse.status).toBe(201);
    athleteCreated = true;
    console.info(`QA athlete created: ${athleteId}`);
  }, 30_000);

  afterAll(async () => {
    if (!enabled) return;
    await deleteInChunks("analytics_events", "client_event_id", [...createdEventIds]);
    await deleteInChunks("analytics_rate_limit_buckets", "key_hash", [...touchedBucketKeys]);
    if (athleteCreated) await deleteInChunks("players", "id", [athleteId]);

    proof.cleanup.athleteRows = await countRows(
      "players",
      `or=(id.eq.${athleteId},slug.eq.${athleteSlug})`,
    );
    proof.cleanup.eventRows = await countRows(
      "analytics_events",
      `client_event_id=in.(${[...createdEventIds].join(",")})`,
    );
    let remainingBucketRows = 0;
    const bucketKeys = [...touchedBucketKeys];
    for (let index = 0; index < bucketKeys.length; index += 40) {
      remainingBucketRows += await countRows(
        "analytics_rate_limit_buckets",
        `key_hash=in.(${bucketKeys.slice(index, index + 40).join(",")})`,
      );
    }
    proof.cleanup.bucketRows = remainingBucketRows;
    expect(proof.cleanup).toEqual({ athleteRows: 0, eventRows: 0, bucketRows: 0 });
    writeFileSync(required("BLTZ_LIVE_ANALYTICS_EVIDENCE_PATH"), JSON.stringify(proof), "utf8");
    console.info(
      `QA cleanup verified: athlete=${athleteId} events=${createdEventIds.size} buckets=${touchedBucketKeys.size}`,
    );
  }, 60_000);

  it("accepts one event and treats the stable retry envelope as a duplicate", async () => {
    const sessionId = randomUUID();
    const headers = {
      "x-vercel-forwarded-for": `qa-valid-${runToken}`,
      "user-agent": `BLTZ-QA/${runToken}`,
      "accept-language": "en-US",
    };
    const envelope = publicEnvelope({
      eventId: validEventId,
      occurredAt: validOccurredAt,
      sessionId,
    });

    const first = await routeRequest(envelope, headers);
    expect(first.status).toBe(202);
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({ accepted: true, duplicate: false });
    proof.firstStatus = first.status;

    const retry = await routeRequest(envelope, headers);
    expect(retry.status).toBe(202);
    const retryBody = await retry.json();
    expect(retryBody).toMatchObject({ accepted: true, duplicate: true });
    proof.duplicateStatus = retry.status;
    proof.duplicate = retryBody.duplicate === true;

    const stored = await stagingRest(
      `analytics_events?select=client_event_id,occurred_at,athlete_id&client_event_id=eq.${validEventId}`,
    );
    expect(stored.status).toBe(200);
    const storedRows = await stored.json() as Array<{
      client_event_id: string;
      occurred_at: string;
      athlete_id: string;
    }>;
    expect(storedRows).toHaveLength(1);
    proof.storedRows = storedRows.length;
    expect(storedRows[0]).toMatchObject({
      client_event_id: validEventId,
      athlete_id: athleteId,
    });
    expect(new Date(storedRows[0].occurred_at).toISOString()).toBe(validOccurredAt);
    proof.timestampPreserved = true;
    console.info(`QA idempotency verified: client_event_id=${validEventId} rows=1`);
  }, 30_000);

  it("rejects browser source spoofing and athlete route mismatch", async () => {
    const spoofed = await routeRequest(publicEnvelope({ source: "athlete_dashboard" }));
    expect(spoofed.status).toBe(400);
    expect(await spoofed.json()).toEqual({ error: "invalid_event" });
    proof.sourceSpoofStatus = spoofed.status;

    const mismatch = await routeRequest(publicEnvelope({ athleteSlug: `different-${runToken}` }));
    expect(mismatch.status).toBe(400);
    expect(await mismatch.json()).toEqual({ error: "athlete_context_mismatch" });
    proof.athleteMismatchStatus = mismatch.status;
  });

  it("suppresses a second client delivery after a permanent live 4xx", async () => {
    const sessionValues = new Map<string, string>();
    vi.stubGlobal("window", {
      crypto: globalThis.crypto,
      location: { pathname: `/player/${athleteSlug}` },
      sessionStorage: {
        getItem: (key: string) => sessionValues.get(key) ?? null,
        setItem: (key: string, value: string) => sessionValues.set(key, value),
      },
    });
    const transport = vi.fn<typeof fetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return routeRequest(body, { "x-vercel-forwarded-for": `qa-permanent-${runToken}` });
    });
    const event = {
      eventName: "locker_viewed" as const,
      source: "public_locker" as const,
      athleteSlug: `different-${runToken}`,
      dedupeKey: `qa-permanent-${runToken}`,
    };

    try {
      expect(await trackProductEvent(event, transport)).toBe(false);
      expect(await trackProductEvent(event, transport)).toBe(false);
      expect(transport).toHaveBeenCalledTimes(1);
      proof.permanentTransportCalls = transport.mock.calls.length;
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reaches the session limit without throttling another session", async () => {
    const sessionId = randomUUID();
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const response = await routeRequest(publicEnvelope({
        sessionId,
        athleteSlug: `different-${runToken}`,
      }));
      expect(response.status, `session attempt ${attempt}`).toBe(400);
    }
    const limited = await routeRequest(publicEnvelope({
      sessionId,
      athleteSlug: `different-${runToken}`,
    }));
    expect(limited.status).toBe(429);
    proof.sessionLimitStatus = limited.status;

    const otherSession = await routeRequest(publicEnvelope({ athleteSlug: `different-${runToken}` }));
    expect(otherSession.status).toBe(400);
    proof.otherSessionStatus = otherSession.status;
    console.info("QA session rate limit verified: limit=30 status=429 other_session=400");
  }, 60_000);

  it("reaches network-profile and network-wide limits without affecting another network", async () => {
    await waitForFreshRateWindow();
    const profileAddress = `qa-profile-${runToken}`;
    const profileHeaders = {
      "x-vercel-forwarded-for": profileAddress,
      "user-agent": `BLTZ-QA-Profile/${runToken}`,
    };
    const profileStatuses: number[] = [];
    for (let offset = 0; offset < 121; offset += 75) {
      const responses = await Promise.all(
        Array.from({ length: Math.min(75, 121 - offset) }, () => routeRequest(
          publicEnvelope({ athleteSlug: `different-${runToken}` }),
          profileHeaders,
        )),
      );
      profileStatuses.push(...responses.map((response) => response.status));
    }
    expect(profileStatuses.filter((status) => status === 400)).toHaveLength(120);
    expect(profileStatuses.filter((status) => status === 429)).toHaveLength(1);
    proof.networkProfileLimitStatus = 429;

    await waitForFreshRateWindow();
    const networkAddress = `qa-network-${runToken}`;
    const networkStatuses: number[] = [];
    for (let offset = 0; offset < 301; offset += 100) {
      const responses = await Promise.all(
        Array.from({ length: Math.min(100, 301 - offset) }, (_, index) => routeRequest(
          publicEnvelope({ athleteSlug: `different-${runToken}` }),
          {
            "x-vercel-forwarded-for": networkAddress,
            "user-agent": `BLTZ-QA-Network/${runToken}/${offset + index}`,
          },
        )),
      );
      networkStatuses.push(...responses.map((response) => response.status));
    }
    expect(networkStatuses.filter((status) => status === 400)).toHaveLength(300);
    expect(networkStatuses.filter((status) => status === 429)).toHaveLength(1);
    proof.networkLimitStatus = 429;

    const otherNetwork = await routeRequest(
      publicEnvelope({ athleteSlug: `different-${runToken}` }),
      {
        "x-vercel-forwarded-for": `qa-other-${runToken}`,
        "user-agent": `BLTZ-QA-Network/${runToken}/other`,
      },
    );
    expect(otherNetwork.status).toBe(400);
    proof.otherNetworkStatus = otherNetwork.status;
    console.info(
      "QA network rate limits verified: profile_limit=120 network_limit=300 status=429 other_network=400",
    );
  }, 180_000);
});
