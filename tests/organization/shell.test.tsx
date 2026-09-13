import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AccessibleOrganization,
  OrganizationContext,
  OrganizationWorkspaceOptions,
} from "@/lib/organization/types";

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

function renderShell(options: OrganizationWorkspaceOptions = { teams: [], seasons: [] }) {
  act(() => {
    root.render(
      <OrganizationShell
        context={context}
        organizations={organizations}
        options={options}
      >
        <div>Authorized workspace content</div>
      </OrganizationShell>,
    );
  });
}

describe("Phase 3 organization shell", () => {
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

  it("renders the authorized organization, current role, and active overview destination", () => {
    renderShell();

    expect(container.textContent).toContain("BLTZ Test Organization");
    expect(container.textContent).toContain("Media Manager");
    expect(container.textContent).toContain("Authorized workspace content");
    expect(container.querySelector('a[aria-current="page"]')?.getAttribute("aria-label")).toBe("Overview");
    expect(container.querySelector('button[aria-label="Switch organization"]')).not.toBeNull();
  });

  it("keeps future modules non-interactive instead of linking to missing routes", () => {
    renderShell();

    const unavailable = [...container.querySelectorAll('[aria-disabled="true"]')];
    expect(unavailable).toHaveLength(4);
    expect(container.querySelector(`a[href="/organization/${ORGANIZATION_ID}/players"]`)).toBeNull();
    expect(container.querySelector('[aria-label="Players — coming soon"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Finance — coming soon"]')).not.toBeNull();
  });

  it("renders the five-link preview navigation and marks finance active", () => {
    navigation.pathname = "/organization/preview/revenue";
    renderShell();

    const destinations = [
      ["Overview", "/organization/preview"],
      ["Players", "/organization/preview/players"],
      ["Media", "/organization/preview/media"],
      ["Agreements", "/organization/preview/agreements"],
      ["Finance", "/organization/preview/revenue"],
    ];

    for (const [label, href] of destinations) {
      const link = container.querySelector(`a[href="${href}"][aria-label="${label}"]`);
      expect(link, label).not.toBeNull();
      expect(link?.getAttribute("aria-label"), label).toBe(label);
    }
    expect(container.querySelector('a[aria-current="page"]')?.getAttribute("aria-label")).toBe("Finance");
    expect(container.querySelector('a[aria-label="Rights"]')).toBeNull();
    expect(container.querySelector('a[aria-label="Reports"]')).toBeNull();
    expect(container.querySelector('[aria-disabled="true"]')).toBeNull();
  });

  it("exposes a labeled mobile navigation control and disables empty filters", () => {
    renderShell();

    expect(container.querySelector('button[aria-label="Open workspace navigation"]')).not.toBeNull();
    const filters = [...container.querySelectorAll("select")];
    expect(filters).toHaveLength(2);
    expect(filters.every((filter) => filter.disabled)).toBe(true);
  });

  it("renders server-supplied team and season options without inventing client data", () => {
    renderShell({
      teams: [{ id: "team-1", name: "Varsity Football", sport: "football" }],
      seasons: [{ id: "season-1", seasonCode: "2026", sport: "football", status: "active" }],
    });

    const options = [...container.querySelectorAll("option")].map((option) => option.textContent);
    expect(options).toContain("Varsity Football (Football)");
    expect(options).toContain("2026 (Football)");
    expect([...container.querySelectorAll("select")].every((filter) => !filter.disabled)).toBe(true);
  });
});
