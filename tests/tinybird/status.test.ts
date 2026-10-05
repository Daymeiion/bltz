// @vitest-environment node
import { describe, expect, it } from "vitest";
import { missingCredentials, summarizeInfo } from "../../scripts/tinybird-status.mjs";

describe("Tinybird diagnostic privacy", () => {
  it("omits workspace, branch, nested, and future sensitive fields from SDK output", () => {
    const safe = summarizeInfo({
      cloud: { workspaceName: "bltz", workspaceId: "workspace-id", apiHost: "https://api.tinybird.co",
        token: "synthetic-workspace-secret", userEmail: "private@example.invalid" },
      project: { devMode: "branch", gitBranch: "codex/preview-locker-release", tinybirdBranch: "codex_preview_locker_release", isMainBranch: false, token: "synthetic-project-secret" },
      branch: { name: "codex_preview_locker_release", id: "branch-id", token: "synthetic-branch-secret" },
      branches: [{ token: "synthetic-other-secret" }], local: { token: "synthetic-local-secret" },
      newSecretField: "synthetic-future-secret",
    });
    expect(safe.workspace.name).toBe("bltz");
    expect(safe.branch?.id).toBe("branch-id");
    expect(JSON.stringify(safe)).not.toMatch(/secret|private@example|token|newSecretField/);
  });

  it("reports absent and blank credentials so connection checks can stop before authentication", () => {
    expect(missingCredentials({})).toEqual(["TINYBIRD_TOKEN", "TINYBIRD_URL"]);
    expect(missingCredentials({ TINYBIRD_TOKEN: "  ", TINYBIRD_URL: "" })).toEqual(["TINYBIRD_TOKEN", "TINYBIRD_URL"]);
    expect(missingCredentials({ TINYBIRD_TOKEN: "synthetic-token", TINYBIRD_URL: "https://api.tinybird.co" })).toEqual([]);
  });

  it("handles missing branch details and malformed diagnostic values without forwarding them", () => {
    expect(summarizeInfo(null).branch).toBeNull();
    expect(summarizeInfo({ cloud: { workspaceName: { token: "synthetic-secret" } } }).workspace.name).toBeNull();
  });
});
