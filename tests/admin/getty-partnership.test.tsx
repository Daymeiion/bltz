import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
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
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("Original overview");
    expect(document.querySelectorAll("form")).toHaveLength(0);
  });

  it("switches all three views by keyboard and preserves the original presentation", async () => {
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);
    await act(async () => root.render(<GettyPartnershipPage />));
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    await act(async () => { tabs[0].focus(); });
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(document.body.textContent).toContain("Proposed 50-player pilot");
    expect(document.body.textContent).toContain("Maximum 150 unique images");
    for (const use of ["Print on demand", "Player podcast", "Player documentary"]) {
      expect(document.body.textContent).toContain(use);
    }
    expect(document.querySelectorAll('a[href="/admin/getty-partnership/download?document=one-sheet"]')).toHaveLength(1);
    expect(document.body.textContent?.match(/Quote to add/g)).toHaveLength(2);
    expect(document.querySelectorAll("blockquote, textarea, input")).toHaveLength(0);
    await act(async () => { tabs[2].focus(); });
    expect(document.body.textContent).toContain("License brief + approval");
    expect(document.body.textContent).toContain("What the pilot asks of each side");
    expect(document.querySelector('a[href="/admin/getty-partnership/download?document=workflow"]')).not.toBeNull();
    await act(async () => { tabs[0].focus(); });
    expect(document.querySelectorAll('img[alt="Getty Images"], img[alt="BLTZ"]')).toHaveLength(2);
    expect(document.body.textContent).toContain("Athlete distribution");
    expect(document.body.textContent).not.toContain("Proposed 50-player pilot");
    await act(async () => root.unmount());
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
