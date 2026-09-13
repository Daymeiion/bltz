import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/logout-button";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Navbar } from "@/components/ui/navbar";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/beta" }));
vi.mock("@/components/ui/search-modal", () => ({ SearchModal: () => null }));

let host: HTMLDivElement;
let root: Root;
let replace: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  signOut.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  replace = vi.spyOn(window.location, "replace").mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

it("ends only the local session and waits before replacing the cached document", async () => {
  let finish!: (result: { error: null }) => void;
  signOut.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await act(async () => root.render(<LogoutButton />));
  const button = host.querySelector("button")!;
  await act(async () => { button.click(); button.click(); });
  expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  expect(button.disabled).toBe(true);
  expect(button.getAttribute("aria-busy")).toBe("true");
  expect(replace).not.toHaveBeenCalled();
  await act(async () => finish({ error: null }));
  expect(replace).toHaveBeenCalledExactlyOnceWith("/auth/login");
});

it.each(["returned", "thrown"])("shows a retryable %s error without navigating", async failure => {
  if (failure === "returned") signOut.mockResolvedValueOnce({ error: new Error("private detail") });
  else signOut.mockRejectedValueOnce(new Error("private detail"));
  signOut.mockResolvedValueOnce({ error: null });
  await act(async () => root.render(<LogoutButton />));
  await act(async () => host.querySelector("button")!.click());
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Sign out failed. Please try again.");
  expect(host.textContent).not.toContain("private detail");
  expect(replace).not.toHaveBeenCalled();
  expect(host.querySelector("button")!.disabled).toBe(false);
  await act(async () => host.querySelector("button")!.click());
  expect(replace).toHaveBeenCalledExactlyOnceWith("/auth/login");
});

it("wires the collapsed desktop Admin logout with an accessible name", async () => {
  signOut.mockResolvedValue({ error: null });
  await act(async () => root.render(<AdminSidebar />));
  expect(host.querySelector('a[aria-label="Dashboard"]')).not.toBeNull();
  const button = host.querySelector<HTMLButtonElement>('button[aria-label="Logout"]')!;
  expect(button.type).toBe("submit");
  expect(button.form?.getAttribute("action")).toBe("/api/admin/logout");
  expect(button.form?.method).toBe("post");
});

it("names mobile navigation, reports state, handles Escape and restores trigger focus", async () => {
  await act(async () => root.render(<AdminSidebar />));
  const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Open admin navigation"]')!;
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await act(async () => { trigger.focus(); trigger.click(); });
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.id).toBe(trigger.getAttribute("aria-controls"));
  expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("BLTZ Admin navigation");
  expect(dialog.contains(document.activeElement)).toBe(true);
  await act(async () => document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)));
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);
});

it("wires mobile Admin logout inside the dialog", async () => {
  signOut.mockResolvedValue({ error: null });
  await act(async () => root.render(<AdminSidebar />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Open admin navigation"]')!.click());
  const logout = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent === "Logout")!;
  expect(logout.type).toBe("submit");
  expect(logout.form?.getAttribute("action")).toBe("/api/admin/logout");
  expect(logout.form?.method).toBe("post");
});

it("offers only real Sign out in the neutral shared account control", async () => {
  signOut.mockResolvedValue({ error: null });
  await act(async () => root.render(<Navbar />));
  const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Account"]')!;
  await act(async () => trigger.click());
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toBe("Sign out");
  expect(host.innerHTML).not.toMatch(/flowbite|Neil sims|My profile|Account settings|New Widget|Bonnie Green/);
  await act(async () => dialog.querySelector<HTMLButtonElement>("button")!.click());
  expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
});
