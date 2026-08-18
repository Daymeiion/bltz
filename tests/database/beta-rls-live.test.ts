import { beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_LIVE_RLS_TESTS === "1";
const jwtVariables = [
  "RLS_TEST_ATHLETE_A_JWT",
  "RLS_TEST_ATHLETE_B_JWT",
  "RLS_TEST_NON_ADMIN_JWT",
  "RLS_TEST_PLATFORM_ADMIN_JWT",
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function publicKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return key;
}

function authHeaders(jwt?: string): Record<string, string> {
  const key = publicKey();
  return {
    apikey: key,
    ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
  };
}

function serviceHeaders(options?: { browserOrigin?: boolean }): Record<string, string> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    ...(!key.startsWith("sb_secret_") ? { authorization: `Bearer ${key}` } : {}),
    ...(options?.browserOrigin ? {
      origin: "http://localhost:3000",
      "user-agent": "Mozilla/5.0 Chrome/127.0.0.0 Safari/537.36",
    } : {}),
  };
}

async function rest(table: string, jwt?: string, init?: RequestInit) {
  return fetch(`${required("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${table}`, {
    ...init,
    headers: {
      ...authHeaders(jwt),
      "content-type": "application/json",
      prefer: "return=minimal",
      ...init?.headers,
    },
  });
}

async function serviceRest(table: string, init?: RequestInit) {
  return fetch(`${required("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${table}`, {
    ...init,
    headers: {
      ...serviceHeaders(),
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

describe.skipIf(!enabled)("live Beta Intelligence RLS roles", () => {
  beforeAll(() => {
    required("NEXT_PUBLIC_SUPABASE_URL");
    publicKey();
    const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey.startsWith("sb_secret_")) {
      throw new Error("Live production-readiness RLS checks require an sb_secret_ server key");
    }
    for (const name of jwtVariables) required(name);
  });

  it.each([
    ["anonymous", undefined],
    ["athlete A", "RLS_TEST_ATHLETE_A_JWT"],
    ["athlete B", "RLS_TEST_ATHLETE_B_JWT"],
    ["authenticated non-admin", "RLS_TEST_NON_ADMIN_JWT"],
  ] as const)("hides raw analytics from %s", async (_role, jwtVariable) => {
    const response = await rest(
      "analytics_events?select=id&limit=1",
      jwtVariable ? required(jwtVariable) : undefined,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each([
    ["athlete_feedback", "RLS_TEST_ATHLETE_A_JWT"],
    ["athlete_feedback", "RLS_TEST_ATHLETE_B_JWT"],
    ["athlete_insights", "RLS_TEST_ATHLETE_A_JWT"],
    ["athlete_insights", "RLS_TEST_ATHLETE_B_JWT"],
  ] as const)("keeps %s private for %s", async (table, jwtVariable) => {
    const response = await rest(`${table}?select=id&limit=1`, required(jwtVariable));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("blocks anonymous direct analytics inserts", async () => {
    const response = await rest("analytics_events", undefined, {
      method: "POST",
      body: JSON.stringify({
        client_event_id: crypto.randomUUID(),
        event_name: "locker_viewed",
        source: "public_locker",
        properties: {},
      }),
    });
    expect(response.ok).toBe(false);
  });

  it("allows the explicit platform-admin fixture to read protected datasets", async () => {
    for (const table of ["analytics_events", "athlete_feedback", "athlete_insights"]) {
      const response = await rest(
        `${table}?select=id&limit=1`,
        required("RLS_TEST_PLATFORM_ADMIN_JWT"),
      );
      expect(response.status, table).toBe(200);
      expect(Array.isArray(await response.json()), table).toBe(true);
    }
  });

  it("allows the server-only sb_secret fixture to bypass RLS for a read", async () => {
    const response = await serviceRest("analytics_events?select=id&limit=1");
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  it("rejects the sb_secret fixture when it is presented as a browser request", async () => {
    const response = await fetch(`${required("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/`, {
      headers: serviceHeaders({ browserOrigin: true }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining("Forbidden use of secret API key in browser"),
    });
  });
});
