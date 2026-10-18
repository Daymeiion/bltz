// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("persists combine events with existing access, audit and revision boundaries", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-preview-combine.mjs"], {encoding:"utf8",timeout:45000});
  expect(result.status,result.stderr).toBe(0);
  expect(result.stdout).toContain("PASS: combine persistence");
},50000);
