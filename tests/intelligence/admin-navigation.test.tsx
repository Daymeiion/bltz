import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/intelligence" }));
vi.mock("framer-motion", () => ({ motion: new Proxy({}, { get: (_target, element: string) => element }) }));
import { AdminSidebar, isAdminSidebarLinkActive } from "@/components/admin/AdminSidebar";

describe("Intelligence Lab admin navigation", () => {
  it("has an active, named desktop Lab destination without activating Dashboard", () => {
    document.body.innerHTML = renderToStaticMarkup(<AdminSidebar />);
    const link = document.querySelector('a[href="/admin/intelligence"]');
    expect(link?.getAttribute("aria-label")).toBe("Intelligence Lab");
    expect(link?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector('a[href="/admin"]')?.hasAttribute("aria-current")).toBe(false);
    expect(isAdminSidebarLinkActive("/admin/intelligence/moment", "/admin/intelligence")).toBe(true);
  });
  it("also offers the Lab through mobile admin navigation", async () => {
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);
    await act(async () => root.render(<AdminSidebar />));
    const toggle = document.querySelector<HTMLButtonElement>('button[aria-label="Open admin navigation"]');
    await act(async () => toggle?.click());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('a[href="/admin/intelligence"]')?.textContent).toContain("Intelligence Lab");
    expect(dialog?.querySelector('a[href="/admin/intelligence"]')?.getAttribute("aria-current")).toBe("page");
    await act(async () => root.unmount());
  });
});
