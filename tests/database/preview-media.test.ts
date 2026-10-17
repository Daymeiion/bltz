// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("persists preview media under real PostgreSQL RLS, revision, audit and enrollment guards", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-preview-media.mjs"], { encoding: "utf8", timeout: 45_000 });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("PASS: media persistence");
}, 50_000);
