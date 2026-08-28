import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const createClient = vi.fn(async () => ({
  auth: { exchangeCodeForSession },
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

describe("password recovery callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exchanges the PKCE code and redirects to the password form", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
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
    exchangeCodeForSession.mockResolvedValue({ error: null });
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
});

