import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const { authorize, redirect } = vi.hoisted(() => ({
  authorize: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));
vi.mock("@/lib/rbac", () => ({ getCurrentAuthorizationProfile: authorize }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/AdminSidebar", () => ({ AdminSidebar: () => <nav>Admin navigation</nav> }));
vi.mock("@/components/admin/AdminThemeShell", () => ({ AdminThemeShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import AdminLayout from "@/app/admin/layout";
import GettyPartnershipPage from "@/app/admin/getty-partnership/page";

describe("Getty partnership presentation", () => {
  it("renders existing local logos, both distribution channels, and the concept qualifier", () => {
    document.body.innerHTML = renderToStaticMarkup(<GettyPartnershipPage />);
    for (const [alt, src] of [["Getty Images", "/images/getty-images-logo.svg"], ["BLTZ", "/bltz-white-logo.svg"]]) {
      expect(document.querySelector(`img[alt="${alt}"]`)?.getAttribute("src")).toBe(src);
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect([...document.querySelectorAll("h2")].map(node => node.textContent)).toEqual(["Athlete distribution", "Enterprise distribution"]);
    expect(document.body.textContent).toContain("Fan connection · Attribution · Commercial value");
    expect(document.body.textContent).toContain("depend on Getty approvals");
    expect(document.querySelectorAll("button, form")).toHaveLength(0);
  });

  it.each([null, { role: "fan" }, { role: "player" }])("rejects unauthorized access through the shared server layout: %j", async (profile) => {
    authorize.mockResolvedValue(profile);
    await expect(AdminLayout({ children: <GettyPartnershipPage /> })).rejects.toThrow("REDIRECT:/auth/admin?error=not_admin");
  });

  it("allows an authorized platform admin through the shared layout", async () => {
    authorize.mockResolvedValue({ role: "admin" });
    const html = renderToStaticMarkup(await AdminLayout({ children: <GettyPartnershipPage /> }));
    expect(html).toContain("Athlete distribution");
    expect(html).toContain("Admin navigation");
  });
});
