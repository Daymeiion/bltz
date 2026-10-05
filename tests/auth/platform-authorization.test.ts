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
