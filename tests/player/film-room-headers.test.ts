// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));
import { proxy } from "@/proxy";
import { metadata } from "@/app/preview-lockers/[slug]/videos/layout";

it("overrides the inherited private preview referrer meta tag", () => {
  expect(metadata.referrer).toBe("strict-origin-when-cross-origin");
});

it.each(["/player/athlete/videos", "/player/athlete/videos/film", "/preview-lockers/private/videos", "/preview-lockers/private/videos/film"])("allows origin-only YouTube identification for %s", async path => {
  const response = await proxy(new NextRequest(`https://bltz.test${path}`));
  expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  expect(response.headers.get("Content-Security-Policy")).toBe("frame-src https://www.youtube.com https://www.youtube-nocookie.com");
  if (path.startsWith("/preview-lockers")) {
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  }
});
it.each(["/preview-lockers/private", "/api/preview-lockers/private/photos", "/admin/preview-lockers/private"])("preserves non-film private headers for %s", async path => {
  const response = await proxy(new NextRequest(`https://bltz.test${path}`));
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Content-Security-Policy")).toBeNull();
});
