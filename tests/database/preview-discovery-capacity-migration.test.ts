import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8").toLowerCase().replace(/\s+/g, " ");
const original = read("20260909035336_expand_preview_discovery_capacity.sql");
// The current definitions: the Oct 29 batch-build migration replaces both functions.
const sql = read("20261029190000_raise_preview_discovery_daily_limit.sql");

it("admits up to 200 active or successful runs per UTC day with a per-player cooldown", () => {
  expect(original).toContain("if charged >= 50 then return null");
  expect(sql).toContain("if charged >= 200 then return null");
  expect(sql).toContain("check (starts between 1 and 200)");
  expect(sql).toContain("least(limits.starts+1,200)");
  expect(sql).toContain("identity_hash = p_identity_hash");
  expect(sql).toContain("interval '180 seconds'");
  expect(sql).toContain("outcome = 'success' or (outcome = 'pending'");
  expect(sql).toContain("interval '120 seconds'");
});

it("finalizes attempts so failures stop consuming the daily allowance", () => {
  expect(sql).toContain("case when p_succeeded then 'success' else 'failure' end");
  expect(sql).toContain("where request_id = p_request_id and user_id = actor and outcome = 'pending'");
});
