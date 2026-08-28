import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@gsap/react", () => ({
  useGSAP: vi.fn(),
}));

vi.mock("gsap", () => ({
  default: { registerPlugin: vi.fn() },
}));

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {},
}));

import { AdminThemeShell } from "@/components/admin/AdminThemeShell";

function renderShell() {
  document.body.innerHTML = renderToStaticMarkup(
    <AdminThemeShell><div data-testid="content">Workspace content</div></AdminThemeShell>,
  );
}

describe("AdminThemeShell workspaces", () => {
  it("renders nested GTM routes in the dedicated workspace shell", () => {
    pathname = "/admin/gtm/contacts";
    renderShell();

    const shell = document.querySelector('[data-admin-workspace="gtm"]');
    expect(shell).not.toBeNull();
    expect(shell?.classList.contains("admin-theme-legacy")).toBe(false);
    expect(document.querySelector("[data-admin-header]")).toBeNull();
    expect(document.body.textContent).toContain("Workspace content");
  });

  it("keeps Beta Intelligence in its existing dedicated workspace shell", () => {
    pathname = "/admin/beta";
    renderShell();

    expect(document.querySelector('[data-admin-workspace="beta"]')).not.toBeNull();
    expect(document.querySelector("[data-admin-header]")).toBeNull();
  });

  it("preserves the legacy hero for existing admin routes", () => {
    pathname = "/admin/users";
    renderShell();

    expect(document.querySelector(".admin-theme-legacy")).not.toBeNull();
    expect(document.querySelector("[data-admin-header]")).not.toBeNull();
    expect(document.body.textContent).toContain("People and access");
  });
});
