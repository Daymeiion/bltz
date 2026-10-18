// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
it("enforces award library RLS, storage policies, revisions, audit and persistence in PostgreSQL",()=>{
 const result=spawnSync(process.execPath,["scripts/verify-award-images.mjs"],{encoding:"utf8",timeout:45000});
 expect(result.status,result.stderr).toBe(0);expect(result.stdout).toContain("PASS: award library migration");
},50000);
