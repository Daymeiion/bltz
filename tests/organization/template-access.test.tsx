import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isInternalAdmin: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/rbac", () => ({ isInternalAdmin: mocks.isInternalAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));

import { requireTemplateAccess } from "@/lib/enterprise-crm/pilot/template-access";
import { LaunchQueue } from "@/app/admin/locker-launches/LaunchQueue";

describe("school template access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("opens for BLTZ admins in production", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.isInternalAdmin.mockResolvedValue(true);
    await expect(requireTemplateAccess("/organization/preview")).resolves.toBeUndefined();
  });

  it("is a 404 for signed-in users who are not admins", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.isInternalAdmin.mockResolvedValue(false);
    await expect(requireTemplateAccess("/organization/preview")).rejects.toThrow("notFound");
  });

  it("sends signed-out visitors to the admin login and back", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireTemplateAccess("/organization/preview/launch")).rejects.toThrow(
      `redirect:/auth/admin?next=${encodeURIComponent("/organization/preview/launch")}`,
    );
    expect(mocks.isInternalAdmin).not.toHaveBeenCalled();
  });

  it("stays open on the dev server without a check", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(requireTemplateAccess("/organization/preview")).resolves.toBeUndefined();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});

function render(node: React.ReactNode): HTMLElement {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  act(() => createRoot(container).render(node));
  return container;
}

function link(container: HTMLElement, text: string): string | null {
  return [...container.querySelectorAll("a")].find((anchor) => anchor.textContent === text)?.getAttribute("href") ?? null;
}

describe("School launches: enrolled schools", () => {
  const launch = { id: "l1", organizationId: "org-1", school: "Cal Athletics", playerName: "Dante Hughes", existingPlayer: true, position: "CB", years: null, contactEmail: null, message: null, status: "requested", statusNote: null, createdAt: "2026-11-01T00:00:00.000Z" };

  it("lists each school with a link to its dashboard and its launch count", () => {
    const container = render(<LaunchQueue schools={[{ id: "org-1", name: "Cal Athletics", status: "approved" }]} launches={[launch]} media={[]} unavailable={false} />);
    expect(link(container, "Open dashboard")).toBe("/organization/org-1/dashboard");
    expect(container.textContent).toContain("Active · 1 launch request(s)");
    expect(link(container, "Edit the school template")).toBe("/organization/preview");
  });

  it("points to the template when no school is enrolled", () => {
    const container = render(<LaunchQueue schools={[]} launches={[]} media={[]} unavailable={false} />);
    expect(container.textContent).toContain("No school is enrolled yet");
  });
});
