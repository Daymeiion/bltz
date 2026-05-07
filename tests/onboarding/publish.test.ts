import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const authUser = { id: "00000000-0000-4000-8000-000000000123" };

const getTestUser = vi.fn(async () => null);
const getTestRun = vi.fn(() => null);
const createClient = vi.fn();
const createServiceClient = vi.fn();

vi.mock("@/lib/onboarding/test-auth", () => ({
  getTestUser,
  getTestRun,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient,
}));

type QueryResult = { data?: unknown; error?: { message: string } | null };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/onboarding/publish", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function publishBody(overrides: Record<string, unknown> = {}) {
  return {
    run_id: "11111111-1111-4111-8111-111111111111",
    full_name: "Daymeion Hughes",
    bio: "Reviewed by the athlete.",
    dob: "2002-01-02",
    height_in: 74,
    weight_lbs: 220,
    games_played: 36,
    position: "LB",
    level: "college",
    school: "Cal",
    hometown: "Berkeley, CA",
    headshot_url: "https://cdn.example.com/headshot.jpg",
    slug: "daymeion-hughes",
    confirmed_fields: { bio: true },
    awards: [
      {
        name: "All-Conference",
        year: "2024",
        organization: "Pac-12",
        source_url: "https://example.com/award",
      },
    ],
    youtube_urls: ["https://youtube.com/watch?v=abc123"],
    photos: [
      {
        url: "https://cdn.example.com/photo.jpg",
        credits: "BLTZ",
        width: 1200,
        height: 800,
      },
    ],
    ...overrides,
  };
}

function createAuthClient(user = authUser) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user } })),
    },
  };
}

function createQueryBuilder(result: QueryResult, onInsert?: (rows: unknown) => void) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    update: vi.fn(() => builder),
    upsert: vi.fn(async () => result),
    insert: vi.fn(function insert(rows: unknown) {
      onInsert?.(rows);
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => result),
        })),
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
    }),
  };
  return builder;
}

function createPublishServiceClient() {
  const insertedTables: string[] = [];
  const rpc: Mock<(...args: unknown[]) => Promise<QueryResult>> = vi.fn(async () => ({
    data: { slug: "daymeion-hughes", playerId: "22222222-2222-4222-8222-222222222222" },
    error: null,
  }));
  const from = vi.fn((table: string) => {
    if (table === "onboarding_pipeline_runs") {
      return createQueryBuilder({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: authUser.id,
          claim_player_id: "22222222-2222-4222-8222-222222222222",
          claim_token: "claim_token_123",
        },
        error: null,
      });
    }
    if (table === "players") {
      return createQueryBuilder({ data: null, error: null });
    }
    if (table === "schools") {
      return createQueryBuilder({ data: { id: "33333333-3333-4333-8333-333333333333" }, error: null });
    }
    return createQueryBuilder({ data: null, error: null }, () => insertedTables.push(table));
  });

  return { from, rpc, insertedTables };
}

describe("POST /api/onboarding/publish", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createClient.mockResolvedValue(createAuthClient());
    getTestUser.mockResolvedValue(null);
    getTestRun.mockReturnValue(null);
  });

  it("publishes claim review data through one atomic database call", async () => {
    const serviceClient = createPublishServiceClient();
    createServiceClient.mockReturnValue(serviceClient);

    const { POST } = await import("@/app/api/onboarding/publish/route");
    const response = await POST(jsonRequest(publishBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "daymeion-hughes",
      playerId: "22222222-2222-4222-8222-222222222222",
    });
    expect(serviceClient.rpc).toHaveBeenCalledOnce();
    expect(serviceClient.rpc).toHaveBeenCalledWith(
      "publish_onboarding_run",
      expect.objectContaining({
        p_run_id: "11111111-1111-4111-8111-111111111111",
        p_user_id: authUser.id,
        p_claim_player_id: "22222222-2222-4222-8222-222222222222",
        p_claim_token: "claim_token_123",
        p_headshot_url: "https://cdn.example.com/headshot.jpg",
      }),
    );
    expect(serviceClient.insertedTables).toEqual([]);
  });

  it("does not mark the run complete when atomic publish fails", async () => {
    const serviceClient = createPublishServiceClient();
    serviceClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "duplicate media rejected" },
    });
    createServiceClient.mockReturnValue(serviceClient);

    const { POST } = await import("@/app/api/onboarding/publish/route");
    const response = await POST(jsonRequest(publishBody()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "could_not_publish",
      detail: "duplicate media rejected",
    });
    expect(serviceClient.insertedTables).toEqual([]);
  });

  it("turns a claimed-token publish race into a conflict response", async () => {
    const serviceClient = createPublishServiceClient();
    serviceClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "claim_token_already_claimed" },
    });
    createServiceClient.mockReturnValue(serviceClient);

    const { POST } = await import("@/app/api/onboarding/publish/route");
    const response = await POST(jsonRequest(publishBody()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "already_claimed",
      detail: "claim_token_already_claimed",
    });
  });
});
