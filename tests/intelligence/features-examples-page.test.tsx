import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), examples: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock("@/lib/intelligence/lab-server", () => ({ authorizeIntelligenceLab: mocks.authorize, IntelligenceAccessError: class extends Error { constructor(public status: number) { super("Private authorization failure"); } } }));
vi.mock("@/lib/intelligence/features/examples", () => ({ buildSyntheticWorkflowExamples: mocks.examples }));
vi.mock("@/app/admin/intelligence/examples/SyntheticExamples", () => ({ SyntheticExamples: () => <div>Isolated synthetic cases</div> }));
import Page from "@/app/admin/intelligence/examples/page";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL_ENV", "development");
  mocks.authorize.mockResolvedValue(undefined);
  mocks.examples.mockReturnValue([]);
  mocks.redirect.mockImplementation(() => { throw new Error("AUTH_REDIRECT"); });
  mocks.notFound.mockImplementation(() => { throw new Error("NOT_FOUND"); });
});
afterEach(() => vi.unstubAllEnvs());

describe("Isolated synthetic examples route", () => {
  it.each(["NODE_ENV", "VERCEL_ENV"] as const)("is unavailable in production through %s before authorization or fixture construction", async key => {
    vi.stubEnv(key, "production");
    await expect(Page()).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.examples).not.toHaveBeenCalled();
  });
  it("authorizes before constructing fictional cases", async () => {
    mocks.examples.mockImplementation(() => { expect(mocks.authorize).toHaveBeenCalledOnce(); return []; });
    expect(renderToStaticMarkup(await Page())).toContain("Isolated synthetic cases");
    expect(mocks.examples).toHaveBeenCalledOnce();
  });
  it.each([401, 403] as const)("denies access before example construction (%s)", async status => {
    mocks.authorize.mockRejectedValue(new IntelligenceAccessError(status));
    await expect(Page()).rejects.toThrow("AUTH_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/admin?error=not_admin");
    expect(mocks.examples).not.toHaveBeenCalled();
  });
  it("fails closed without disclosing private auth errors", async () => {
    mocks.authorize.mockRejectedValue(new Error("PRIVATE_RPC_PAYLOAD"));
    const html = renderToStaticMarkup(await Page());
    expect(html).toContain("Admin authorization is temporarily unavailable");
    expect(html).not.toContain("PRIVATE_RPC_PAYLOAD");
    expect(mocks.examples).not.toHaveBeenCalled();
  });
});
