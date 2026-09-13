import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/confirm/route";

const { verifyOtp, createClient } = vi.hoisted(() => ({ verifyOtp: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
beforeEach(() => {
  vi.resetAllMocks();
  verifyOtp.mockResolvedValue({ data: { user: { id: "test-user" }, session: { user: { id: "test-user" } } }, error: null });
  createClient.mockResolvedValue({ auth: { verifyOtp } });
});
const request = (query: string) => new NextRequest("http://localhost/auth/confirm?" + query);

it.each(["", "&next=%2F", "&next=https%3A%2F%2Fevil.invalid", "&next=%2Fprotected"])(
  "routes verified recovery to password update regardless of next %s", async next => {
    const response = await GET(request("type=recovery&token_hash=synthetic-token" + next));
    expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({ type: "recovery", token_hash: "synthetic-token" });
    expect(response.headers.get("location")).toBe("http://localhost/auth/update-password");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  },
);

it.each(["", "type=recovery", "token_hash=synthetic-token", "type=sms&token_hash=synthetic-token"])(
  "rejects incomplete or unsupported callbacks without verification: %s", async query => {
    const response = await GET(request(query));
    expect(response.headers.get("location")).toBe("http://localhost/auth/error?error=invalid_link");
    expect(createClient).not.toHaveBeenCalled();
  },
);

it.each(["otp_expired", "invalid_token"])("does not forward %s or upstream/token details", async code => {
  verifyOtp.mockResolvedValue({ data: { user: null }, error: { code, status: 403, message: "synthetic-token private detail" } });
  const response = await GET(request("type=recovery&token_hash=synthetic-token&next=%2Fadmin"));
  expect(response.headers.get("location")).toBe("http://localhost/auth/error?error=invalid_link");
  expect(await response.text()).not.toContain("synthetic-token");
});

it.each(["returned", "thrown"])("fails closed on %s service errors", async kind => {
  if (kind === "returned") verifyOtp.mockResolvedValue({ data: { user: null }, error: { status: 0, message: "private detail" } });
  else verifyOtp.mockRejectedValue(new Error("private detail"));
  expect((await GET(request("type=recovery&token_hash=synthetic-token"))).headers.get("location"))
    .toBe("http://localhost/auth/error?error=verification_unavailable");
});

it("does not claim verification success without a returned user", async () => {
  verifyOtp.mockResolvedValue({ data: { user: null }, error: null });
  expect((await GET(request("type=recovery&token_hash=synthetic-token"))).headers.get("location"))
    .toContain("error=invalid_link");
});

it("requires a returned recovery session, not merely a user or URL type", async () => {
  verifyOtp.mockResolvedValue({ data: { user: { id: "test-user" }, session: null }, error: null });
  expect((await GET(request("type=recovery&token_hash=synthetic-token"))).headers.get("location"))
    .toContain("error=invalid_link");
});

it.each(["signup", "email", "invite", "magiclink", "email_change"])("preserves verified %s local destination and strips callback metadata", async type => {
  const response = await GET(request(new URLSearchParams({
    type, token_hash: "synthetic-token", next: "/protected?token_hash=do-not-forward#access_token=private",
  }).toString()));
  expect(response.headers.get("location")).toBe("http://localhost/protected");
});

it.each(["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/%2f%2fevil.invalid",
  "/%252f%252fevil.invalid", "/%5cevil.invalid", "/%0a/evil.invalid", "/a/..//evil.invalid", "/auth/confirm"])(
  "cannot redirect outside or loop via %s", async next => {
    const response = await GET(request(new URLSearchParams({ type: "signup", token_hash: "synthetic-token", next }).toString()));
    expect(response.headers.get("location")).toBe("http://localhost/");
  },
);

it("keeps signup's existing root default", async () => {
  expect((await GET(request("type=signup&token_hash=synthetic-token"))).headers.get("location")).toBe("http://localhost/");
});
