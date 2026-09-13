import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260909035336_expand_preview_discovery_capacity.sql", "utf8").toLowerCase().replace(/\s+/g, " ");

it("admits up to 50 active or successful runs per UTC day with a per-player cooldown", () => {
  expect(sql).toContain("if charged >= 50 then return null");
  expect(sql).toContain("identity_hash = p_identity_hash");
  expect(sql).toContain("interval '180 seconds'");
  expect(sql).toContain("outcome = 'success' or (outcome = 'pending'");
  expect(sql).toContain("interval '120 seconds'");
});

it("finalizes attempts so failures stop consuming the daily allowance", () => {
  expect(sql).toContain("case when p_succeeded then 'success' else 'failure' end");
  expect(sql).toContain("where request_id = p_request_id and user_id = actor and outcome = 'pending'");
});
