import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(path), "utf8");
}

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

describe("platform assignment authorization", () => {
  it("derives the effective admin capability only from is_internal_admin", () => {
    const rbac = source("lib/rbac.ts").replace(/\s+/g, " ");

    expect(rbac).toContain('supabase.rpc("is_internal_admin")');
    expect(rbac).toContain('return profile.role === "admin" ? { ...profile, role: "fan" } : profile');
    expect(rbac).toContain('return { ...profile, role: "admin" }');
    expect(rbac).not.toContain("user_metadata?.role");
    expect(rbac).not.toContain("raw_user_meta_data");
  });

  it("routes every Admin API through the assignment-resolved profile or admin RPC", () => {
    for (const file of routeFiles(resolve("app/api/admin"))) {
      const route = readFileSync(file, "utf8");
      if (file.endsWith(join("login", "route.ts"))) {
        expect(route.replace(/\s+/g, " ")).toContain(
          'supabase.rpc( "is_internal_admin"',
        );
        expect(route).not.toContain('.from("profiles")');
        continue;
      }

      if (file.endsWith(join("logout", "route.ts"))) {
        expect(route).toContain('supabase.auth.signOut({ scope: "local" })');
        expect(route).toContain("isTrustedAdminLogoutOrigin");
        continue;
      }

      expect(route).not.toContain("getCurrentUserProfile");
      if (file.includes(join("admin", "award-images")) || file.includes(join("admin", "award-catalog"))) {
        expect(route).toContain("await previewAdmin()");
        for (const operation of ["client.from(", "client.storage.", "await readBody(", "await adminAwardLibrary("]) {
          if (route.includes(operation)) expect(route.indexOf("await previewAdmin()")).toBeLessThan(route.indexOf(operation));
        }
        continue;
      }
      const isAccessExtension = file.endsWith(join("preview-lockers", "[id]", "access-extension", "route.ts"));
      const isInvitationEmail = file.endsWith(join("preview-lockers", "[id]", "invitation-email", "route.ts"));
      if (isAccessExtension || isInvitationEmail) {
        // These endpoints use the existing preview Admin gate, whose effective
        // capability is resolved by the same database assignment predicate.
        expect(route).toContain("await previewAdmin()");
        const mutation = isAccessExtension ? 'client.rpc("extend_preview_link_access"' : "await sendPreviewInvitationEmail(";
        expect(route.indexOf(mutation)).toBeGreaterThanOrEqual(0);
        expect(route.indexOf("await previewAdmin()")).toBeLessThan(route.indexOf(mutation));
        const helper = source("lib/preview-lockers/server.ts");
        const user = helper.slice(helper.indexOf("export async function previewUser"), helper.indexOf("export async function previewAccess"));
        const access = helper.slice(helper.indexOf("export async function previewAccess"), helper.indexOf("export async function previewAdmin"));
        const admin = helper.slice(helper.indexOf("export async function previewAdmin"), helper.indexOf("export function json"));
        expect(user).toContain("client.auth.getUser()");
        expect(access).toContain('client.rpc("is_internal_admin")');
        expect(access).toContain("isAdmin: role.data === true");
        expect(admin).toContain('if (!access.isAdmin) throw new PreviewError("forbidden", 403)');
        continue;
      }
      if (file.endsWith(join("intelligence", "route.ts"))) {
        // Intelligence delegates to its existing server-only assignment gate.
        // Check the whole boundary rather than only the route's helper name.
        expect(route).toContain("await loadIntelligenceWorkspace(params)");
        const workspace = source("lib/intelligence/workspace-server.ts");
        const loader = workspace.slice(workspace.indexOf("export async function loadIntelligenceWorkspace"));
        expect(loader.indexOf("await authorizeIntelligenceLab()")).toBeGreaterThanOrEqual(0);
        expect(loader.indexOf("await authorizeIntelligenceLab()")).toBeLessThan(loader.indexOf("createServiceClient()"));
        const gate = source("lib/intelligence/lab-server.ts");
        expect(gate).toContain('session.auth.getUser()');
        expect(gate).toContain('session.rpc("is_internal_admin")');
        expect(gate).toContain('permission.data !== true');
        continue;
      }
      if (file.includes(join("admin", "intelligence", "getty")) || file.includes(join("admin", "intelligence", "share")) || file.includes(join("admin", "intelligence", "review"))) {
        // Lab integrations reuse the Intelligence assignment gate before any configuration or provider call.
        const gate = route.indexOf("await authorizeIntelligenceLab()");
        expect(gate).toBeGreaterThanOrEqual(0);
        for (const operation of ["process.env", "fetch(", "createServiceClient("]) {
          let at = route.indexOf(operation);
          while (at >= 0) {
            const handler = route.lastIndexOf("export async function", at);
            expect(route.indexOf("await authorizeIntelligenceLab()", handler)).toBeLessThan(at);
            at = route.indexOf(operation, at + 1);
          }
        }
        continue;
      }
      expect(route).toMatch(/getCurrentAuthorizationProfile|isInternalAdmin/);
    }
  });

  it("protects the Admin layout and service-only Beta queries with assignment checks", () => {
    expect(source("app/admin/layout.tsx")).toContain("getCurrentAuthorizationProfile");
    expect(source("lib/beta-intelligence/query.ts")).toContain("requireInternalAdmin");
    expect(source("lib/queries/beta-intelligence.ts")).toContain("requireInternalAdmin");
  });

  it("removes profile-admin bypasses from non-Admin privileged routes", () => {
    const revenue = source("app/api/revenue/calculate/route.ts");
    const upload = source("app/api/messages/upload/route.ts");
    const videos = source("app/api/dashboard/videos/[id]/route.ts");
    const claims = source("app/api/admin/claim-tokens/route.ts");

    expect(revenue).toContain("getCurrentAuthorizationProfile");
    expect(upload).toContain("isInternalAdmin");
    expect(videos).toContain("isInternalAdmin");
    expect(claims).toContain("isInternalAdmin");
    expect(`${revenue}\n${upload}\n${videos}`).not.toMatch(/profile\.role\s*===?\s*["']admin["']/);
  });
});
