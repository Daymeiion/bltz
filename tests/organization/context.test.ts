import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  OrganizationContextAccessError,
  resolveOrganizationContextWithReader,
  type OrganizationContextReader,
} from "@/lib/organization/context";
import { hasOrganizationRole, type OrganizationContext } from "@/lib/organization/types";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

function createReader(
  overrides: Partial<OrganizationContextReader> = {},
): OrganizationContextReader {
  return {
    getAuthenticatedUserId: vi.fn().mockResolvedValue(USER_ID),
    getActiveMembership: vi.fn().mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      role: "viewer",
    }),
    getOrganization: vi.fn().mockResolvedValue({
      id: ORGANIZATION_ID,
      name: "BLTZ Test Organization",
      organization_type: "team",
      status: "approved",
      school_id: null,
    }),
    isInternalAdmin: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("server organization context", () => {
  it("rejects invalid route identifiers before authentication or database access", async () => {
    const reader = createReader();
    const result = await resolveOrganizationContextWithReader("not-an-id", reader);

    expect(result).toEqual({ ok: false, reason: "invalid_organization_id" });
    expect(reader.getAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("requires identity from the authenticated server session", async () => {
    const reader = createReader({
      getAuthenticatedUserId: vi.fn().mockResolvedValue(null),
    });

    await expect(resolveOrganizationContextWithReader(ORGANIZATION_ID, reader)).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(reader.getActiveMembership).not.toHaveBeenCalled();
  });

  it("returns an operational organization only from an active server-resolved membership", async () => {
    const reader = createReader();
    const result = await resolveOrganizationContextWithReader(ORGANIZATION_ID.toUpperCase(), reader);

    expect(result).toEqual({
      ok: true,
      context: {
        userId: USER_ID,
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
          role: "viewer",
        },
      },
    });
    expect(reader.getActiveMembership).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
    });
    expect(reader.isInternalAdmin).not.toHaveBeenCalled();
  });

  it("fails closed for a non-member without a platform assignment", async () => {
    const reader = createReader({
      getActiveMembership: vi.fn().mockResolvedValue(null),
    });

    await expect(resolveOrganizationContextWithReader(ORGANIZATION_ID, reader)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(reader.isInternalAdmin).toHaveBeenCalledOnce();
    expect(reader.getOrganization).not.toHaveBeenCalled();
  });

  it("allows only the database-derived super-admin predicate to cross membership scope", async () => {
    const reader = createReader({
      getActiveMembership: vi.fn().mockResolvedValue(null),
      isInternalAdmin: vi.fn().mockResolvedValue(true),
    });
    const result = await resolveOrganizationContextWithReader(ORGANIZATION_ID, reader);

    expect(result).toMatchObject({
      ok: true,
      context: { access: { scope: "platform", role: "super_admin" } },
    });
  });

  it.each(["draft", "suspended", "closed"])(
    "does not make a %s organization operational through CRM context",
    async (status) => {
      const reader = createReader({
        getOrganization: vi.fn().mockResolvedValue({
          id: ORGANIZATION_ID,
          name: "Unavailable Organization",
          organization_type: "team",
          status,
          school_id: null,
        }),
      });

      await expect(resolveOrganizationContextWithReader(ORGANIZATION_ID, reader)).resolves.toEqual({
        ok: false,
        reason: "forbidden",
      });
    },
  );

  it("applies organization role requirements without trusting a browser role", () => {
    const memberContext: OrganizationContext = {
      userId: USER_ID,
      organization: {
        id: ORGANIZATION_ID,
        name: "BLTZ Test Organization",
        organizationType: "team",
        status: "approved",
        schoolId: null,
      },
      access: { scope: "organization", membershipId: "membership-id", role: "viewer" },
    };
    const platformContext: OrganizationContext = {
      ...memberContext,
      access: { scope: "platform", role: "super_admin" },
    };

    expect(hasOrganizationRole(memberContext, ["viewer"])).toBe(true);
    expect(hasOrganizationRole(memberContext, ["owner", "organization_admin"])).toBe(false);
    expect(hasOrganizationRole(platformContext, ["owner"])).toBe(true);
    expect(new OrganizationContextAccessError("forbidden").reason).toBe("forbidden");
  });

  it("binds the production reader to auth.uid-equivalent identity, active status, and the admin RPC", () => {
    const source = readFileSync(resolve("lib/organization/context.ts"), "utf8");
    const normalized = source.replace(/\s+/g, " ");

    expect(normalized).toContain("supabase.auth.getUser()");
    expect(normalized).toContain('.eq("organization_id", organizationId)');
    expect(normalized).toContain('.eq("user_id", userId)');
    expect(normalized).toContain('.eq("status", "active")');
    expect(normalized).toContain('supabase.rpc("is_internal_admin")');
    expect(normalized).not.toContain("profiles.role");
    expect(normalized).not.toContain("user_metadata");
  });
});
