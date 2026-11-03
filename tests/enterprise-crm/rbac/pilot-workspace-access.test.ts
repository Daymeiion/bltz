import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { parseAccessSnapshot, createSupabaseAccessAdapter } from "@/lib/enterprise-crm/auth/supabase-adapter";
import { parseSchoolIdentity } from "@/lib/enterprise-crm/theme/supabase-adapter";
import {
  PLATFORM_SUPPORT_PERMISSIONS,
  resolveWorkspaceAccessWith,
} from "@/lib/enterprise-crm/workspace-access";
import type { TrustedEnterpriseAccessAdapter } from "@/lib/enterprise-crm/auth/trusted-resolver";
import type { ExactSchoolThemeAdapter } from "@/lib/enterprise-crm/theme/resolver";
import type { OrganizationContext } from "@/lib/organization/types";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const ORG_ID = "20000000-0000-4000-8000-000000000002";
const MEMBERSHIP_ID = "30000000-0000-4000-8000-000000000003";
const SCHOOL_ID = "40000000-0000-4000-8000-000000000004";
const NOW = new Date("2026-11-02T15:00:00.000Z");

function row(permissions: unknown = ["executive.overview.read", "intelligence.read"], overrides: Record<string, unknown> = {}) {
  return {
    membership_id: MEMBERSHIP_ID,
    user_id: USER_ID,
    organization_id: ORG_ID,
    status: "active",
    authorization_version: 3,
    permissions,
    ...overrides,
  };
}

function memberContext(schoolId: string | null = SCHOOL_ID): OrganizationContext {
  return {
    userId: USER_ID,
    organization: { id: ORG_ID, name: "Pilot University", organizationType: "school", status: "approved", schoolId },
    access: { scope: "organization", membershipId: MEMBERSHIP_ID, role: "viewer" },
  };
}

const noSchool: ExactSchoolThemeAdapter = { resolveExactIdentity: async () => ({ kind: "missing" }) };

function accessFrom(value: unknown): TrustedEnterpriseAccessAdapter {
  return { loadAccessSnapshot: async () => parseAccessSnapshot(value, new Date()) };
}

describe("pilot access snapshot parsing", () => {
  it("maps the RPC row to an organization-wide snapshot that expires shortly", () => {
    const snapshot = parseAccessSnapshot(row(), NOW);
    expect(snapshot?.version).toBe("membership-v3");
    expect(snapshot?.team).toBeNull();
    expect(snapshot?.teamGrant).toBeNull();
    expect(snapshot?.permissionGrants.map((grant) => grant.permission)).toEqual([
      "executive.overview.read",
      "intelligence.read",
    ]);
    expect(snapshot?.permissionGrants.every((grant) => grant.teamId === null)).toBe(true);
    expect(Date.parse(snapshot!.expiresAt) - NOW.getTime()).toBe(60_000);
  });

  it.each([
    ["null", null],
    ["array", []],
    ["unknown status", row(undefined, { status: "pending" })],
    ["string version", row(undefined, { authorization_version: "3" })],
    ["non-string permissions", row([1])],
  ])("rejects a malformed %s row", (_label, value) => {
    expect(parseAccessSnapshot(value, NOW)).toBeNull();
  });

  it("never asks the database for team-scoped access", async () => {
    const rpc = vi.fn();
    const adapter = createSupabaseAccessAdapter({ rpc } as never, () => NOW);
    await expect(adapter.loadAccessSnapshot({ actorUserId: USER_ID, organizationId: ORG_ID, teamId: ORG_ID })).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("treats an RPC error as no access", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const adapter = createSupabaseAccessAdapter({ rpc } as never, () => NOW);
    await expect(adapter.loadAccessSnapshot({ actorUserId: USER_ID, organizationId: ORG_ID, teamId: null })).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("enterprise_access_snapshot", { p_user_id: USER_ID, p_organization_id: ORG_ID });
  });
});

describe("pilot workspace access", () => {
  it("projects granted permissions into shell capabilities", async () => {
    const access = await resolveWorkspaceAccessWith(memberContext(), { access: accessFrom(row()), theme: noSchool });
    expect(access.capabilities["navigation.home"]).toBe(true);
    expect(access.capabilities["navigation.intelligence"]).toBe(true);
    expect(access.capabilities["navigation.athletes"]).toBe(false);
    expect(access.capabilities["surface.financial"]).toBe(false);
    expect(access.capabilities["utility.notifications"]).toBe(false);
  });

  it.each([
    ["no grants", row([])],
    ["a suspended membership", row(undefined, { status: "suspended" })],
    ["a different user", row(undefined, { user_id: "50000000-0000-4000-8000-000000000005" })],
    ["a different organization", row(undefined, { organization_id: "60000000-0000-4000-8000-000000000006" })],
    ["an unknown permission", row(["executive.overview.read", "billing.write"])],
  ])("denies every capability for %s", async (_label, value) => {
    const access = await resolveWorkspaceAccessWith(memberContext(), { access: accessFrom(value), theme: noSchool });
    expect(Object.values(access.capabilities).every((available) => available === false)).toBe(true);
  });

  it("gives BLTZ platform admins every non-financial capability without reading member grants", async () => {
    const load = vi.fn();
    const context: OrganizationContext = { ...memberContext(), access: { scope: "platform", role: "super_admin" } };
    const access = await resolveWorkspaceAccessWith(context, { access: { loadAccessSnapshot: load }, theme: noSchool });
    expect(load).not.toHaveBeenCalled();
    expect(PLATFORM_SUPPORT_PERMISSIONS).not.toContain("financial.summary.read");
    expect(access.capabilities["navigation.home"]).toBe(true);
    expect(access.capabilities["utility.theme_admin"]).toBe(true);
    expect(access.capabilities["surface.financial"]).toBe(false);
  });

  it("uses the exact school identity for branding and BLTZ Default otherwise", async () => {
    const school: ExactSchoolThemeAdapter = {
      resolveExactIdentity: async (schoolId) => parseSchoolIdentity(schoolId, {
        id: schoolId,
        college_directory_id: 77,
        directory: { id: 77, primary_color_hex: "8B1E3F", secondary_color_hex: "#F2C14E", logo_url: "https://cdn.example.edu/logo.svg" },
      }),
    };
    const branded = await resolveWorkspaceAccessWith(memberContext(), { access: accessFrom(row()), theme: school });
    expect(branded.theme).toEqual({ mode: "school", accent: "#8b1e3f", highlight: "#f2c14e", logoUrl: "https://cdn.example.edu/logo.svg" });

    const unlinked = await resolveWorkspaceAccessWith(memberContext(null), { access: accessFrom(row()), theme: school });
    expect(unlinked.theme.mode).toBe("bltz");
  });
});

describe("school directory identity parsing", () => {
  it("requires the typed directory link", () => {
    expect(parseSchoolIdentity(SCHOOL_ID, { id: SCHOOL_ID, college_directory_id: null, directory: null }).kind).toBe("missing");
  });

  it("rejects mismatched or colorless directory rows", () => {
    expect(parseSchoolIdentity(SCHOOL_ID, { id: SCHOOL_ID, college_directory_id: 5, directory: { id: 6, primary_color_hex: "#000000", secondary_color_hex: "#ffffff" } }).kind).toBe("unsafe");
    expect(parseSchoolIdentity(SCHOOL_ID, { id: SCHOOL_ID, college_directory_id: 5, directory: { id: 5, primary_color_hex: "navy", secondary_color_hex: "#ffffff" } }).kind).toBe("unsafe");
  });

  it("rejects a row for a different school", () => {
    expect(parseSchoolIdentity(SCHOOL_ID, { id: ORG_ID, college_directory_id: 5, directory: { id: 5, primary_color_hex: "#8b1e3f", secondary_color_hex: "#f2c14e" } }).kind).toBe("missing");
  });
});
