import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const createClient = vi.fn(async () => ({
  auth: { exchangeCodeForSession },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

describe("password recovery callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ data: { user: { id: "synthetic" }, session: { access_token: "synthetic-token" } }, error: null });
  });

  it("exchanges the PKCE code and redirects to the password form", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3100/auth/callback?code=recovery-code&sb_flow_id=flow-1&next=%2Fauth%2Fupdate-password",
    );

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("recovery-code", {
      flowId: "flow-1",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost:3100/auth/update-password",
    );
  });

  it("does not allow an external post-recovery redirect", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3100/auth/callback?code=recovery-code&next=https%3A%2F%2Fevil.example",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3100/");
  });

  it("sends missing and expired recovery codes to the Auth error page", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const missing = await GET(
      new NextRequest("http://localhost:3100/auth/callback?next=%2Fauth%2Fupdate-password"),
    );
    expect(missing.headers.get("location")).toContain("/auth/error?error=");
    expect(createClient).not.toHaveBeenCalled();

    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    const expired = await GET(
      new NextRequest(
        "http://localhost:3100/auth/callback?code=expired-code&next=%2Fauth%2Fupdate-password",
      ),
    );
    expect(expired.headers.get("location")).toContain("/auth/error?error=");
  });

  it.each(["/dashboard", "/admin/gtm/contacts?queue=identity_review", "/"])("preserves valid OAuth/app destination %s", async next => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new NextRequest(`http://localhost:3100/auth/callback?code=synthetic-code&next=${encodeURIComponent(next)}`));
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("synthetic-code", undefined);
    expect(response.headers.get("location")).toBe(`http://localhost:3100${next}`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each(["/\\evil.example", "/%2fevil.example", "/%252fevil.example", "/auth/callback", "/auth/confirm"])("contains unsafe/loop destination %s", async next => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new NextRequest(`http://localhost:3100/auth/callback?code=synthetic-code&next=${encodeURIComponent(next)}`));
    expect(response.headers.get("location")).toBe("http://localhost:3100/");
  });

  it("does not propagate credential query fields or fragments from next", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const next = "/dashboard?tab=profile&code=secret&token_hash=secret&access_token=secret&refresh_token=secret&error_description=secret&sb_flow_id=secret#secret";
    const response = await GET(new NextRequest(`http://localhost:3100/auth/callback?code=synthetic-code&next=${encodeURIComponent(next)}`));
    expect(response.headers.get("location")).toBe("http://localhost:3100/dashboard?tab=profile");
  });

  it.each([
    { user: null, session: { access_token: "synthetic" } },
    { user: { id: "synthetic" }, session: null },
  ])("requires returned user and session, not only no error", async data => {
    exchangeCodeForSession.mockResolvedValue({ data, error: null });
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new NextRequest("http://localhost:3100/auth/callback?code=synthetic-code"));
    expect(response.headers.get("location")).toBe("http://localhost:3100/auth/error?error=invalid_link");
  });

  it.each(["returned", "thrown"])("uses fixed private errors for unavailable Auth (%s)", async kind => {
    if (kind === "returned") exchangeCodeForSession.mockResolvedValue({ data: null, error: { status: 503, message: "private-detail" } });
    else exchangeCodeForSession.mockRejectedValue(new Error("private-detail"));
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new NextRequest("http://localhost:3100/auth/callback?code=synthetic-code"));
    expect(response.headers.get("location")).toBe("http://localhost:3100/auth/error?error=verification_unavailable");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});

