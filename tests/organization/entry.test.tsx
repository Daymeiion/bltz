import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAccessibleOrganizations: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/organization/context", () => ({
  listAccessibleOrganizations: mocks.listAccessibleOrganizations,
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import OrganizationEntryPage from "@/app/organization/page";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

describe("organization entry routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends unauthenticated users through the existing login flow", async () => {
    mocks.listAccessibleOrganizations.mockResolvedValue({
      ok: false,
      reason: "unauthenticated",
    });

    await expect(OrganizationEntryPage()).rejects.toThrow("redirect:");
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent("/organization")}`,
    );
  });

  it("sends an authenticated user without membership to the safe selection state", async () => {
    mocks.listAccessibleOrganizations.mockResolvedValue({
      ok: true,
      userId: "user-id",
      organizations: [],
    });

    await expect(OrganizationEntryPage()).rejects.toThrow("redirect:/organization/select");
  });

  it("opens the first alphabetically ordered accessible workspace", async () => {
    mocks.listAccessibleOrganizations.mockResolvedValue({
      ok: true,
      userId: "user-id",
      organizations: [
        {
          organization: {
            id: ORGANIZATION_ID,
            name: "Alpha Athletics",
            organizationType: "school",
            status: "approved",
            schoolId: null,
          },
          access: {
            scope: "organization",
            membershipId: "membership-id",
            role: "viewer",
          },
        },
      ],
    });

    await expect(OrganizationEntryPage()).rejects.toThrow(
      `redirect:/organization/${ORGANIZATION_ID}/dashboard`,
    );
  });
});

