import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_LIVE_RLS_TESTS === "1";
const required = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "RLS_TEST_ATHLETE_A_JWT", "RLS_TEST_ATHLETE_B_JWT",
  "RLS_TEST_NON_ADMIN_JWT", "RLS_TEST_PLATFORM_ADMIN_JWT",
] as const;

function env(name: (typeof required)[number]): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function rest(table: string, jwt?: string, init?: RequestInit) {
  const url = `${env("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/${table}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      authorization: `Bearer ${jwt ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY")}`,
      "content-type": "application/json",
      prefer: "return=minimal",
      ...init?.headers,
    },
  });
}

describe.skipIf(!enabled)("live Beta Intelligence RLS roles", () => {
  it("has all required role credentials", () => {
    for (const name of required) expect(env(name), name).toBeTruthy();
  });

  it.each([
    ["anonymous", undefined],
    ["athlete A", process.env.RLS_TEST_ATHLETE_A_JWT],
    ["athlete B", process.env.RLS_TEST_ATHLETE_B_JWT],
    ["authenticated non-admin", process.env.RLS_TEST_NON_ADMIN_JWT],
  ])("hides raw analytics from %s", async (_role, jwt) => {
    const response = await rest("analytics_events?select=id&limit=1", jwt);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each([
    ["athlete_feedback", process.env.RLS_TEST_ATHLETE_A_JWT],
    ["athlete_feedback", process.env.RLS_TEST_ATHLETE_B_JWT],
    ["athlete_insights", process.env.RLS_TEST_ATHLETE_A_JWT],
    ["athlete_insights", process.env.RLS_TEST_ATHLETE_B_JWT],
  ])("keeps %s private from regular athletes", async (table, jwt) => {
    const response = await rest(`${table}?select=id&limit=1`, jwt);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("blocks anonymous direct analytics inserts", async () => {
    const response = await rest("analytics_events", undefined, {
      method: "POST",
      body: JSON.stringify({
        client_event_id: crypto.randomUUID(), event_name: "locker_viewed",
        source: "public_locker", properties: {},
      }),
    });
    expect(response.ok).toBe(false);
  });

  it("allows a platform admin to read protected datasets", async () => {
    for (const table of ["analytics_events", "athlete_feedback", "athlete_insights"]) {
      const response = await rest(`${table}?select=id&limit=1`, env("RLS_TEST_PLATFORM_ADMIN_JWT"));
      expect(response.status, table).toBe(200);
    }
  });
});
