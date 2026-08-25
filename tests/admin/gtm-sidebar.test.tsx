import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, element: string) => element,
  }),
}));

import {
  AdminSidebar,
  isAdminSidebarLinkActive,
} from "@/components/admin/AdminSidebar";

function renderSidebar() {
  document.body.innerHTML = renderToStaticMarkup(<AdminSidebar />);
}

describe("AdminSidebar GTM destination", () => {
  beforeEach(() => {
    pathname = "/admin";
    document.body.innerHTML = "";
  });

  it("preserves the existing destinations and adds GTM", () => {
    renderSidebar();

    const expectedHrefs = [
      "/admin",
      "/admin/users",
      "/admin/messages",
      "/admin/moderation",
      "/admin/analytics",
      "/admin/beta",
      "/admin/gtm",
      "/admin/settings",
    ];

    for (const href of expectedHrefs) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("marks GTM current for nested GTM routes without activating Dashboard", () => {
    pathname = "/admin/gtm/contacts/example-contact";
    renderSidebar();

    const gtmLinks = document.querySelectorAll('a[href="/admin/gtm"]');
    expect(gtmLinks).toHaveLength(1);
    for (const link of gtmLinks) {
      expect(link.getAttribute("aria-current")).toBe("page");
    }

    for (const link of document.querySelectorAll('a[href="/admin"]')) {
      expect(link.hasAttribute("aria-current")).toBe(false);
    }

    expect(isAdminSidebarLinkActive(pathname, "/admin/gtm")).toBe(true);
    expect(isAdminSidebarLinkActive(pathname, "/admin")).toBe(false);
    expect(isAdminSidebarLinkActive("/admin/users/example-user", "/admin/users")).toBe(false);
  });

  it("exposes the mobile navigation toggle state to assistive technology", () => {
    renderSidebar();

    const toggle = document.querySelector('button[aria-controls="admin-mobile-navigation"]');
    expect(toggle?.getAttribute("aria-label")).toBe("Open navigation");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });
});
