import { describe, expect, it, vi } from "vitest";
import { buildSyntheticWorkflowExample, buildSyntheticWorkflowExamples } from "@/lib/intelligence/features/examples";
import { intelligenceFeatureSnapshotSchema, measuredSignalEvaluationSchema } from "@/lib/intelligence/features";

describe("isolated supplied synthetic workflow examples", () => {
  it("builds all six supplied scenarios with persistent labels and explicit exclusions", () => {
    const rows = buildSyntheticWorkflowExamples();
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map(row => row.id)).size).toBe(6);
    for (const row of rows) {
      expect(row).toMatchObject({ synthetic: true, environment: "synthetic", label: "Synthetic example", isolation: "isolated_development_only", mayPersist: false, athleteName: "Synthetic Athlete A" });
      expect(row.subjectNamespace).toBe(`synthetic:${row.id}`);
      expect(row.playerId).toBe("10000000-0000-4000-8000-000000000001");
      expect(row.excludeFrom).toEqual(expect.arrayContaining(["production_features", "live_watchlist", "financial_allocations", "payouts", "real_partner_reporting", "live_counts", "event_delivery"]));
      expect(row.checks.filter(check => check.basis !== "contract_expectation").every(check => check.passed)).toBe(true);
      expect(row.assumptions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("reuses the real anniversary rule to reproduce 96 priority and sourced 0.97 confidence", () => {
    const row = buildSyntheticWorkflowExample("anniversary_blocked_media")!;
    expect(row.outcome).toMatchObject({ signal_type: "historical_anniversary", editorial_priority: 96, confidence: 0.97, days_until: 3, anniversary_years: 20, target_date: "2026-10-07", readiness: "research_needed", activation_count: 0, earnings_cents: null });
    expect(row.careerEvaluation?.signals[0].key).toMatch(/^synthetic:/);
    expect(row.careerEvaluation?.opportunities[0].signalKeys).toEqual([row.careerEvaluation?.signals[0].key]);
  });

  it("runs actual discovery projection and detector while leaving draft reach and permissions unknown", () => {
    const row = buildSyntheticWorkflowExample("measured_discovery_to_activation_draft")!;
    expect(row.snapshot?.current.metrics.eligibleDistinctSessions.value).toBe(120);
    expect(row.snapshot?.current.metrics.qualifiedSessions.value).toBe(0);
    expect(row.outcome).toMatchObject({ absolute_increase: 80, growth: 2, growth_display: "+200%", athlete_distributed_session_fraction: 0.6, publishing_allowed: false, approved_brand_agreement: false, activation_impressions: null, earnings_cents: null });
    expect(row.evaluation?.signals.find(signal => signal.type === "locker_discovery_spike")).toMatchObject({ environment: "synthetic", momentId: null, commercialReadiness: "research_needed" });
    expect(row.activation).toMatchObject({ persisted: false, reach: null, impressions: null, proposedBrands: [{ name: "Synthetic Brand A", status: "proposed" }] });
    expect(row.evaluation?.signals.every(signal => signal.key.includes(":synthetic:"))).toBe(true);
    expect(row.evaluation?.opportunities.every(opportunity => opportunity.key.startsWith("synthetic:"))).toBe(true);
  });

  it("does not invent growth, a qualified audience or a commercial opportunity in the partial scenario", () => {
    const row = buildSyntheticWorkflowExample("zero_baseline_and_partial_coverage")!;
    expect(row.outcome).toMatchObject({ growth: null, activity_label: "new_activity", coverage_state: "partial", engagement_spike_signal_count: 0, opportunity_count: 0, no_infinite_percentage: true });
    expect(row.outcome.suppression_reasons).toEqual(expect.arrayContaining(["incomplete_baseline_coverage", "insufficient_sample"]));
    expect(row.evaluation?.signals.map(signal => signal.type)).toEqual(["measurement_coverage_failure"]);
  });

  it("keeps contract arithmetic explicitly separate from actual partner outcomes and finance", () => {
    const row = buildSyntheticWorkflowExample("license_distribution_conversion_and_refund")!;
    expect(row.snapshot).toBeNull();
    expect(row.evaluation).toBeNull();
    expect(row.outcome).toMatchObject({ bltz_commission_cents: 1500, allocated_athlete_cents: 600, paid_athlete_cents: 0, bltz_contribution_before_refund_cents: 650, logical_refund_reversals: 1, athlete_allocation_after_refund_cents: 0, bltz_contribution_after_refund_cents: -250 });
    expect(row.checks.every(check => check.basis === "arithmetic_simulation")).toBe(true);
    expect(row.assumptions.join(" ")).toContain("fixture assumptions only");
    expect(row.assumptions.join(" ")).toContain("No transaction or allocation engine");
  });

  it("executes permission denial while preserving unexecuted pause and audit expectations", () => {
    const row = buildSyntheticWorkflowExample("rights_revocation_after_approval")!;
    expect(row.outcome).toMatchObject({ publishing_allowed: false, actual_workflow_transition_executed: false, analytics_refresh_required_for_denial: false });
    expect(row.checks.find(check => check.name === "publishing_allowed")).toMatchObject({ passed: true, basis: "executed_pure_code" });
    expect(row.checks.find(check => check.name === "activation_state")).toMatchObject({ expected: "paused", actual: null, passed: null, basis: "contract_expectation" });
    expect(row.checks.find(check => check.name === "requires_audit_record")?.passed).toBeNull();
    expect(row.activation).toMatchObject({ state: "expected_paused", persisted: false, publishingAllowed: false });
  });

  it("reproduces actual lost-ack logical deduplication and delayed feature fence", () => {
    const row = buildSyntheticWorkflowExample("duplicate_delivery_and_stale_feature_job")!;
    expect(row.outcome).toMatchObject({ logical_event_count: 1, deduplicate_before_aggregation: true, old_feature_write_allowed: false, feature_watermark_retained: "2026-10-04T19:00:00Z", no_duplicate_signals: true });
    expect(row.snapshot?.quality.duplicateDeliveries).toBe(2);
    expect(row.checks.find(check => check.name === "no_duplicate_signal_or_allocation")?.passed).toBeNull();
  });

  it("rejects synthetic outputs at the live feature and detector persistence parsers", () => {
    const rows = buildSyntheticWorkflowExamples();
    for (const row of rows) {
      if (row.snapshot) expect(intelligenceFeatureSnapshotSchema.safeParse(row.snapshot).success).toBe(false);
      if (row.evaluation?.signals.length) expect(measuredSignalEvaluationSchema.safeParse(row.evaluation).success).toBe(false);
    }
  });

  it("is deterministic and performs no fetch or clock-dependent work", () => {
    const request = vi.spyOn(globalThis, "fetch");
    const first = buildSyntheticWorkflowExamples();
    const second = buildSyntheticWorkflowExamples();
    expect(second).toEqual(first);
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
    expect(buildSyntheticWorkflowExample("not-a-supplied-scenario")).toBeNull();
  });
});
