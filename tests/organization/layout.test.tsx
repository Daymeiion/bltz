import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveOrganizationContext: vi.fn(),
  listAccessibleOrganizations: vi.fn(),
  listOrganizationWorkspaceOptions: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

vi.mock("@/lib/organization/context", () => ({
  resolveOrganizationContext: mocks.resolveOrganizationContext,
  listAccessibleOrganizations: mocks.listAccessibleOrganizations,
  listOrganizationWorkspaceOptions: mocks.listOrganizationWorkspaceOptions,
}));

vi.mock("@/components/organization/OrganizationShell", () => ({
  OrganizationShell: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="organization-shell">{children}</section>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));

import OrganizationLayout from "@/app/organization/[organizationId]/layout";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

function renderLayout(organizationId = ORGANIZATION_ID) {
  return OrganizationLayout({
    children: <div>Authorized child</div>,
    params: Promise.resolve({ organizationId }),
  });
}

describe("protected organization layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAccessibleOrganizations.mockResolvedValue({
      ok: true,
      userId: "user-id",
      organizations: [],
    });
    mocks.listOrganizationWorkspaceOptions.mockResolvedValue({ teams: [], seasons: [] });
  });

  it("renders children after server organization authorization succeeds", async () => {
    mocks.resolveOrganizationContext.mockResolvedValueOnce({
      ok: true,
      context: {
        userId: "user-id",
        organization: {
          id: ORGANIZATION_ID,
          name: "BLTZ Test Organization",
          organizationType: "team",
          status: "approved",
          schoolId: null,
        },
        access: { scope: "organization", membershipId: "membership-id", role: "viewer" },
      },
    });

    const shell = await renderLayout();
    expect(shell.props.context.organization.id).toBe(ORGANIZATION_ID);
    expect(shell.props.organizations).toHaveLength(1);
    expect(shell.props.options).toEqual({ teams: [], seasons: [] });
    expect(shell.props.children).toMatchObject({ props: { children: "Authorized child" } });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated request to login with an internal next target", async () => {
    mocks.resolveOrganizationContext.mockResolvedValueOnce({
      ok: false,
      reason: "unauthenticated",
    });

    await expect(renderLayout()).rejects.toThrow("redirect:");
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent(`/organization/${ORGANIZATION_ID}/dashboard`)}`,
    );
  });

  it.each(["forbidden", "invalid_organization_id"])(
    "returns not-found for %s access without revealing tenant existence",
    async (reason) => {
      mocks.resolveOrganizationContext.mockResolvedValueOnce({ ok: false, reason });

      await expect(renderLayout()).rejects.toThrow("not-found");
      expect(mocks.notFound).toHaveBeenCalled();
      expect(mocks.listAccessibleOrganizations).not.toHaveBeenCalled();
    },
  );
});
