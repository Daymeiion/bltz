import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AccessibleOrganization,
  OrganizationContext,
  OrganizationWorkspaceOptions,
} from "@/lib/organization/types";
import type { WorkspaceAccess } from "@/lib/enterprise-crm/workspace-access";

const navigation = vi.hoisted(() => ({
  pathname: "/organization/11111111-1111-4111-8111-111111111111/dashboard",
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: navigation.refresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } }),
}));

import { OrganizationShell } from "@/components/organization/OrganizationShell";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const context: OrganizationContext = {
  userId: "22222222-2222-4222-8222-222222222222",
  organization: {
    id: ORGANIZATION_ID,
    name: "BLTZ Test Organization",
    organizationType: "team",
    status: "approved",
    schoolId: null,
  },
  access: {
    scope: "organization",
    membershipId: "33333333-3333-4333-8333-333333333333",
    role: "media_manager",
  },
};
const organizations: AccessibleOrganization[] = [
  { organization: context.organization, access: context.access },
];

let container: HTMLDivElement;
let root: Root;

function renderShell(options: OrganizationWorkspaceOptions = { teams: [], seasons: [] }, access?: WorkspaceAccess) {
  act(() => {
    root.render(
      <OrganizationShell
        context={context}
        organizations={organizations}
        options={options}
        access={access}
      >
        <div>Authorized workspace content</div>
      </OrganizationShell>,
    );
  });
}

describe("Pilot school workspace shell", () => {
  beforeEach(() => {
    navigation.pathname = `/organization/${ORGANIZATION_ID}/dashboard`;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });


  function access(granted: string[], theme: WorkspaceAccess["theme"] = { mode: "bltz", accent: "#2952ff", highlight: "#d6a500", logoUrl: null }): WorkspaceAccess {
    const keys = ["navigation.home", "navigation.athletes", "navigation.media", "navigation.opportunities", "navigation.activations", "navigation.intelligence", "navigation.analytics", "navigation.organization", "utility.global_search", "utility.create", "utility.notifications", "utility.theme_admin", "surface.financial"] as const;
    return { capabilities: Object.fromEntries(keys.map((key) => [key, granted.includes(key)])) as WorkspaceAccess["capabilities"], canManageActivations: false, theme };
  }

  function railLinks() {
    return [...container.querySelectorAll('.pilot-rail nav[aria-label="School workspace"] a')].map((link) => [link.textContent, link.getAttribute("href")]);
  }

  it("shows the school, the member's role and the active page", () => {
    renderShell();

    expect(container.textContent).toContain("BLTZ Test Organization");
    expect(container.textContent).toContain("Media Manager");
    expect(container.querySelector('.pilot-rail a[aria-current="page"]')?.textContent).toContain("Overview");
    expect(container.querySelector('[data-product="enterprise-crm"]')).not.toBeNull();
    expect(container.textContent).toContain("Authorized workspace content");
  });

  it("offers only the pilot destinations", () => {
    renderShell();

    expect(railLinks()).toEqual([
      ["Overview", `/organization/${ORGANIZATION_ID}/dashboard`],
      ["Intelligence", `/organization/${ORGANIZATION_ID}/intelligence`],
      ["Launch a Locker", `/organization/${ORGANIZATION_ID}/launch`],
    ]);
    const nav = container.querySelector(".pilot-rail nav")?.textContent ?? "";
    for (const removed of ["Athletes", "Media", "Opportunities", "Activations", "Analytics", "Organization"]) {
      expect(nav, removed).not.toContain(removed);
    }
    for (const removed of ["Create", "Search workspace", "All Athletics", "Notifications"]) {
      expect(container.textContent, removed).not.toContain(removed);
    }
    expect(container.querySelector("select")).toBeNull();
  });

  it("points preview navigation at the fictional preview pages", () => {
    navigation.pathname = "/organization/preview/intelligence/p1";
    renderShell();

    expect(railLinks()).toEqual([
      ["Overview", "/organization/preview"],
      ["Intelligence", "/organization/preview/intelligence"],
      ["Launch a Locker", "/organization/preview/launch"],
    ]);
    expect(container.querySelector('.pilot-rail a[aria-current="page"]')?.textContent).toContain("Intelligence");
  });

  it("hides destinations the member has not been granted", () => {
    renderShell({ teams: [], seasons: [] }, access(["navigation.home"]));
    expect(railLinks()).toEqual([["Overview", `/organization/${ORGANIZATION_ID}/dashboard`]]);
  });

  it("shows Launch a Locker only to members who can plan activations", () => {
    renderShell({ teams: [], seasons: [] }, access(["navigation.home", "navigation.intelligence"]));
    expect(railLinks().map(([label]) => label)).toEqual(["Overview", "Intelligence"]);

    renderShell({ teams: [], seasons: [] }, { ...access(["navigation.home", "navigation.intelligence"]), canManageActivations: true });
    expect(railLinks().map(([label]) => label)).toEqual(["Overview", "Intelligence", "Launch a Locker"]);
  });

  it("opens and closes the mobile menu", () => {
    renderShell();
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="pilot-mobile-menu"]')!;
    const menu = container.querySelector<HTMLElement>("#pilot-mobile-menu")!;

    expect(menu.hidden).toBe(true);
    act(() => toggle.click());
    expect(menu.hidden).toBe(false);
    expect(toggle.getAttribute("aria-label")).toBe("Close navigation");
    act(() => menu.querySelector<HTMLAnchorElement>("a.pilot-nav__item")!.click());
    expect(menu.hidden).toBe(true);
  });

  it("starts on the school canvas and switches to white, remembering the choice", () => {
    window.localStorage.removeItem("bltz-enterprise-canvas");
    renderShell();
    const shell = () => container.querySelector<HTMLElement>('[data-product="enterprise-crm"]')!;
    expect(shell().dataset.canvas).toBe("school");

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Page background"] button[aria-checked="false"]')!.click());
    expect(shell().dataset.canvas).toBe("white");
    expect(window.localStorage.getItem("bltz-enterprise-canvas")).toBe("white");
    window.localStorage.removeItem("bltz-enterprise-canvas");
  });

  it("applies the exact school colors by default", () => {
    renderShell({ teams: [], seasons: [] }, access(["navigation.home"], { mode: "school", accent: "#8b1e3f", highlight: "#f2c14e", logoUrl: null }));

    const shell = container.querySelector<HTMLElement>('[data-product="enterprise-crm"]');
    expect(shell?.dataset.organizationTheme).toBe("school");
    expect(shell?.style.getPropertyValue("--crm-org-accent")).toBe("#8b1e3f");
  });

  it("stays on BLTZ colors when the school has no exact identity", () => {
    renderShell({ teams: [], seasons: [] }, access(["navigation.home"]));

    const shell = container.querySelector<HTMLElement>('[data-product="enterprise-crm"]');
    expect(shell?.dataset.organizationTheme).toBe("bltz");
    expect(shell?.style.getPropertyValue("--crm-org-accent")).toBe("#2952ff");
  });
});
