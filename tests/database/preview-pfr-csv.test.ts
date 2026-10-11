// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("persists NFL CSV through real PostgreSQL with existing RLS, audit, revision and enrollment guards", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-preview-pfr-csv.mjs"], { encoding: "utf8", timeout: 45_000 });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("PASS: NFL CSV persistence");
}, 50_000);
