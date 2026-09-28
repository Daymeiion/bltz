import { beforeEach, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => query }));

import { GET } from "@/app/[shortLink]/route";
import { validShortLinkAlias } from "@/lib/preview-lockers/short-link";

const context = (shortLink: string) => ({ params: Promise.resolve({ shortLink }) });

beforeEach(() => query.from.mockReset());

it("redirects a published name to the Vercel Locker without caching or sign-in", async () => {
  query.from.mockImplementation((table: string) => table === "preview_locker_short_links"
    ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { preview_id: "preview-id" }, error: null }) }) }) }) }
    : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { slug: "keith-rivers-3a92b4f331f083552d05" }, error: null }) }) }) });
  const response = await GET(new Request("https://bltz.me/keith-rivers"), context("keith-rivers"));
  expect(response.status).toBe(307);
  expect(response.headers.get("Location")).toBe("https://bltz.vercel.app/preview-lockers/keith-rivers-3a92b4f331f083552d05");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
});

it("does not disclose or redirect unknown names", async () => {
  query.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) });
  const response = await GET(new Request("https://bltz.me/unknown-player"), context("unknown-player"));
  expect(response.status).toBe(404);
  expect(response.headers.get("Location")).toBeNull();
  expect(query.from).toHaveBeenCalledTimes(1);
});

it("does not redirect an unpublished alias to a sign-in page", async () => {
  query.from.mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) });
  const response = await GET(new Request("https://bltz.me/draft-player"), context("draft-player"));
  expect(response.status).toBe(404);
  expect(response.headers.get("Location")).toBeNull();
  expect(query.from).toHaveBeenCalledTimes(1);
});

it("rejects names that overlap application routes", () => {
  expect(validShortLinkAlias("player")).toBe(false);
  expect(validShortLinkAlias("preview-lockers")).toBe(false);
  expect(validShortLinkAlias("keith-rivers")).toBe(true);
});
