import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const authUser = { id: "00000000-0000-4000-8000-000000000123" };

const createClient = vi.fn();
const createServiceClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient,
}));

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/onboarding/claim", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function authClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: authUser } })),
    },
  };
}

function chain(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
  };
  return builder;
}

describe("POST /api/onboarding/claim", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createClient.mockResolvedValue(authClient());
  });

  it("reuses this user's existing review run for an unclaimed token", async () => {
    const insert = vi.fn();
    const from = vi.fn((table: string) => {
      if (table === "claim_tokens") {
        return chain({
          token: "claim_token_123",
          player_id: "22222222-2222-4222-8222-222222222222",
          expires_at: "2999-01-01T00:00:00.000Z",
          claimed_at: null,
        });
      }
      if (table === "onboarding_pipeline_runs") {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          is: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => ({
            data: { id: "11111111-1111-4111-8111-111111111111", user_id: authUser.id },
            error: null,
          })),
          insert: vi.fn(() => {
            insert();
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "11111111-1111-4111-8111-111111111111" },
                  error: null,
                })),
              })),
            };
          }),
        };
        return builder;
      }
      if (table === "players") {
        return chain({
          id: "22222222-2222-4222-8222-222222222222",
          full_name: "Daymeion Hughes",
          position: "LB",
          level: "college",
          school_id: null,
        });
      }
      if (table === "player_awards" || table === "media") {
        return chain([]);
      }
      throw new Error(`unexpected table ${table}`);
    });
    createServiceClient.mockReturnValue({ from });

    const { POST } = await import("@/app/api/onboarding/claim/route");
    const response = await POST(jsonRequest({ token: "claim_token_123" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      runId: "11111111-1111-4111-8111-111111111111",
      reused: true,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a second user while the claim token already has an active review run", async () => {
    const insert = vi.fn();
    const from = vi.fn((table: string) => {
      if (table === "claim_tokens") {
        return chain({
          token: "claim_token_123",
          player_id: "22222222-2222-4222-8222-222222222222",
          expires_at: "2999-01-01T00:00:00.000Z",
          claimed_at: null,
        });
      }
      if (table === "onboarding_pipeline_runs") {
        const builder = {
          filters: [] as Array<[string, unknown]>,
          select: vi.fn(() => builder),
          eq: vi.fn((column: string, value: unknown) => {
            builder.filters.push([column, value]);
            return builder;
          }),
          is: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => {
            const asksForThisUser = builder.filters.some(
              ([column, value]) => column === "user_id" && value === authUser.id,
            );
            return {
              data: asksForThisUser
                ? null
                : {
                    id: "99999999-9999-4999-8999-999999999999",
                    user_id: "88888888-8888-4888-8888-888888888888",
                  },
              error: null,
            };
          }),
          insert,
        };
        return builder;
      }
      if (table === "players") {
        return chain({
          id: "22222222-2222-4222-8222-222222222222",
          full_name: "Daymeion Hughes",
          position: "LB",
          level: "college",
          school_id: null,
        });
      }
      if (table === "player_awards" || table === "media") {
        return chain([]);
      }
      throw new Error(`unexpected table ${table}`);
    });
    createServiceClient.mockReturnValue({ from });

    const { POST } = await import("@/app/api/onboarding/claim/route");
    const response = await POST(jsonRequest({ token: "claim_token_123" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "claim_in_progress" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps the one-active-review-run rule enforced by a claim-token unique index", () => {
    const migration = readFileSync(
      join(process.cwd(), "lib/supabase/migrations/20260505000002_atomic_onboarding_publish.sql"),
      "utf8",
    );

    expect(migration).toContain("onboarding_pipeline_runs_active_claim_token_idx");
    expect(migration).toContain("on onboarding_pipeline_runs (claim_token)");
    expect(migration).toContain("completed_at is null");
  });
});
