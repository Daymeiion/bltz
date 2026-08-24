import { describe, expect, it, vi } from "vitest";
import { sanitizeExistingAuditMetadata } from "@/lib/enterprise-crm/audit/sanitize";
import { createEnterpriseCacheKey } from "@/lib/enterprise-crm/data/cache-key";
import { composeAuthorizedFinancialSection } from "@/lib/enterprise-crm/data/privacy";
import { EXECUTIVE_SOURCE_MAP } from "@/lib/enterprise-crm/data/source-map";
import {
  EXECUTIVE_AUTHORIZATION_FIXTURES,
  EXECUTIVE_REQUIRED_SCENARIOS,
  EXECUTIVE_TEST_IDS,
} from "@/lib/enterprise-crm/fixtures/executive-test-fixtures";

describe("Executive data source mapping", () => {
  it("covers every required dependency and blocks unapproved models", () => {
    expect(EXECUTIVE_SOURCE_MAP.map((entry) => entry.concept)).toEqual([
      "Organization / school identity",
      "Team / scope",
      "Membership / permission",
      "Athlete summary",
      "Opportunity",
      "Activation",
      "Media / rights",
      "Financial exception",
      "Intelligence signal",
      "Assignment / task",
      "Notification",
      "Audit event",
      "Executive projection",
    ]);

    for (const concept of [
      "Opportunity",
      "Activation",
      "Assignment / task",
      "Notification",
      "Executive projection",
    ]) {
      expect(EXECUTIVE_SOURCE_MAP.find((entry) => entry.concept === concept)).toMatchObject({
        disposition: "missing",
        existingSources: [],
      });
    }
  });

  it("does not treat legacy financial, media, or intelligence data as Executive truth", () => {
    for (const concept of ["Media / rights", "Financial exception", "Intelligence signal"] as const) {
      expect(EXECUTIVE_SOURCE_MAP.find((entry) => entry.concept === concept)?.disposition).toBe(
        "partial_unsafe",
      );
    }
  });
});

describe("scope-safe cache identity", () => {
  it("changes across actor, organization, team scope, permissions, and filters", () => {
    const base = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;
    const baseKey = createEnterpriseCacheKey("overview", base, { range: "ytd" });
    const variants = [
      { ...base, actorUserId: EXECUTIVE_TEST_IDS.teamOperator },
      { ...base, scope: { ...base.scope, organizationId: EXECUTIVE_TEST_IDS.otherOrganization } },
      EXECUTIVE_AUTHORIZATION_FIXTURES.teamOperator,
      { ...base, permissions: ["executive.overview.read"] as const },
    ];

    for (const variant of variants) {
      expect(createEnterpriseCacheKey("overview", variant, { range: "ytd" })).not.toBe(baseKey);
    }
    expect(createEnterpriseCacheKey("overview", base, { range: "month" })).not.toBe(baseKey);
  });

  it("is stable for reordered permissions and filter keys", () => {
    const base = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;
    const reordered = { ...base, permissions: [...base.permissions].reverse() };
    expect(createEnterpriseCacheKey("overview", base, { b: 2, a: 1 })).toBe(
      createEnterpriseCacheKey("overview", reordered, { a: 1, b: 2 }),
    );
  });

  it("changes when the trusted authorization snapshot version changes", () => {
    const base = EXECUTIVE_AUTHORIZATION_FIXTURES.organizationExecutive;
    expect(createEnterpriseCacheKey("overview", base)).not.toBe(
      createEnterpriseCacheKey("overview", {
        ...base,
        authorizationVersion: "fixture-v2",
      }),
    );
  });
});

describe("financial omission", () => {
  it("does not load or serialize financial data without explicit permission", () => {
    const loadFinancial = vi.fn(() => ({ revenueYtd: 100_000 }));
    const payload = composeAuthorizedFinancialSection(
      { athleteCount: 12 },
      "financial.summary.read",
      EXECUTIVE_AUTHORIZATION_FIXTURES.executiveWithoutFinance.permissions,
      loadFinancial,
    );

    expect(payload).toEqual({ athleteCount: 12 });
    expect(payload).not.toHaveProperty("financial");
    expect(loadFinancial).not.toHaveBeenCalled();
  });

  it("loads the section only after the exact financial grant", () => {
    const loadFinancial = vi.fn(() => ({ revenueYtd: 100_000 }));
    expect(
      composeAuthorizedFinancialSection(
        { athleteCount: 12 },
        "financial.summary.read",
        ["financial.summary.read"],
        loadFinancial,
      ),
    ).toEqual({ athleteCount: 12, financial: { revenueYtd: 100_000 } });
    expect(loadFinancial).toHaveBeenCalledOnce();
  });
});

describe("existing audit contract safety", () => {
  it("keeps only explicitly allowed, schema-valid scalar metadata", () => {
    const metadata = sanitizeExistingAuditMetadata({
      source: "assignment",
      teamId: EXECUTIVE_TEST_IDS.team,
      arbitrary: "would have passed the former blacklist",
      comment: "private detail",
      revenueValue: 12345,
      nested: { status: "changed", email: "person@example.test" },
    });

    expect(metadata).toEqual({
      source: "assignment",
      teamId: EXECUTIVE_TEST_IDS.team,
    });
  });

  it("omits unknown and sensitive keys even when their values look safe", () => {
    expect(
      sanitizeExistingAuditMetadata({
        status: "changed",
        email: "safe-looking-token",
        comment: "brief",
        amount: 1,
        actorUserId: EXECUTIVE_TEST_IDS.executive,
      }),
    ).toEqual({});
  });

  it("rejects nested payloads and invalid values for allowed keys", () => {
    expect(
      sanitizeExistingAuditMetadata({
        source: { value: "assignment" },
        teamId: { value: EXECUTIVE_TEST_IDS.team },
      }),
    ).toEqual({});
    expect(
      sanitizeExistingAuditMetadata({
        source: "Assignment contains spaces",
        teamId: "not-a-uuid",
      }),
    ).toEqual({});
    expect(
      sanitizeExistingAuditMetadata({
        source: ["assignment"],
        teamId: [EXECUTIVE_TEST_IDS.team],
      }),
    ).toEqual({});
  });

  it("rejects non-object roots", () => {
    expect(sanitizeExistingAuditMetadata("secret")).toEqual({});
    expect(sanitizeExistingAuditMetadata(["secret"])).toEqual({});
  });
});

describe("deterministic fixture contract", () => {
  it("covers all required Executive states without production data", () => {
    expect(EXECUTIVE_REQUIRED_SCENARIOS).toHaveLength(10);
    expect(Object.keys(EXECUTIVE_AUTHORIZATION_FIXTURES)).toEqual([
      "organizationExecutive",
      "teamOperator",
      "executiveWithoutFinance",
      "organizationAdmin",
      "mediaRightsOperator",
      "financeOperator",
      "outOfScopeMember",
    ]);
    expect(new Set(Object.values(EXECUTIVE_TEST_IDS)).size).toBe(
      Object.values(EXECUTIVE_TEST_IDS).length,
    );
  });
});
