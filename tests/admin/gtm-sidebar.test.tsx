import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
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
    expect(toggle?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(toggle?.classList.contains("h-11")).toBe(true);
    expect(toggle?.classList.contains("w-11")).toBe(true);
  });

  it("contains mobile focus and restores it to the toggle when Escape closes the dialog", () => {
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);

    act(() => root.render(<AdminSidebar />));

    const toggle = document.querySelector<HTMLButtonElement>('button[aria-controls="admin-mobile-navigation"]');
    expect(toggle).not.toBeNull();

    act(() => toggle?.click());

    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    expect(dialog?.getAttribute("aria-label")).toBe("Admin navigation");
    expect(document.activeElement).toBe(dialog?.querySelector("a"));

    const lastFocusable = dialog?.querySelector<HTMLButtonElement>("button:last-of-type");
    lastFocusable?.focus();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
    expect(document.activeElement).toBe(dialog?.querySelector("a"));

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);

    act(() => root.unmount());
  });
});
