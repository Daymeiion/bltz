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

    const toggle = document.querySelector('button[aria-label="Open admin navigation"]');
    expect(toggle?.hasAttribute("aria-controls")).toBe(true);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(toggle?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(toggle?.classList.contains("h-11")).toBe(true);
    expect(toggle?.classList.contains("w-11")).toBe(true);
  });

  it("contains mobile focus and restores it to the toggle when Escape closes the dialog", async () => {
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);

    await act(async () => root.render(<AdminSidebar />));

    const toggle = document.querySelector<HTMLButtonElement>('button[aria-label="Open admin navigation"]');
    expect(toggle).not.toBeNull();

    await act(async () => { toggle?.focus(); toggle?.click(); });

    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    expect(dialog?.id).toBe(toggle?.getAttribute("aria-controls"));
    expect(document.getElementById(dialog!.getAttribute("aria-labelledby")!)?.textContent).toBe("BLTZ Admin navigation");
    const firstFocusable = document.activeElement;
    expect(dialog?.contains(firstFocusable)).toBe(true);

    const lastFocusable = [...dialog!.querySelectorAll<HTMLButtonElement>("button")].at(-1);
    lastFocusable?.focus();
    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    // Radix may initially autofocus a button; Tab order still wraps to the
    // first navigation link, not necessarily that initial autofocus target.
    expect(document.activeElement).toBe(dialog?.querySelector("a"));

    await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await act(async () => new Promise(resolve => setTimeout(resolve, 0)));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);

    await act(async () => root.unmount());
  });

  it("posts logout through the server authorization boundary", () => {
    renderSidebar();
    const forms = document.querySelectorAll('form[action="/api/admin/logout"][method="post"]');
    expect(forms).toHaveLength(1);
    for (const form of forms) {
      expect(form.querySelector('button[type="submit"]')?.textContent).toContain("Logout");
    }
  });
});
