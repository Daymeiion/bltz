import type { ResolvedEnterpriseGrants } from "@/lib/enterprise-crm/auth/authorize";

// Test-only deterministic identities. Never import this module from production code.
export const EXECUTIVE_TEST_IDS = {
  organization: "10000000-0000-4000-8000-000000000001",
  otherOrganization: "10000000-0000-4000-8000-000000000002",
  team: "20000000-0000-4000-8000-000000000001",
  otherTeam: "20000000-0000-4000-8000-000000000002",
  executive: "30000000-0000-4000-8000-000000000001",
  teamOperator: "30000000-0000-4000-8000-000000000002",
  financeDenied: "30000000-0000-4000-8000-000000000003",
  administrator: "30000000-0000-4000-8000-000000000004",
  unauthorized: "30000000-0000-4000-8000-000000000005",
  mediaRightsOperator: "30000000-0000-4000-8000-000000000006",
  financeOperator: "30000000-0000-4000-8000-000000000007",
} as const;

export const EXECUTIVE_AUTHORIZATION_FIXTURES = {
  organizationExecutive: {
    actorUserId: EXECUTIVE_TEST_IDS.executive,
    membershipId: "40000000-0000-4000-8000-000000000001",
    source: "canonical_membership",
    scope: {
      kind: "organization",
      organizationId: EXECUTIVE_TEST_IDS.organization,
    },
    permissions: [
      "executive.overview.read",
      "athlete.read",
      "opportunity.read",
      "assignment.create",
      "workload.read",
      "member.read",
    ],
    authorizationVersion: "fixture-v1",
  },
  teamOperator: {
    actorUserId: EXECUTIVE_TEST_IDS.teamOperator,
    membershipId: "40000000-0000-4000-8000-000000000002",
    source: "canonical_membership",
    scope: {
      kind: "team",
      organizationId: EXECUTIVE_TEST_IDS.organization,
      teamId: EXECUTIVE_TEST_IDS.team,
    },
    permissions: ["executive.overview.read", "athlete.read"],
    authorizationVersion: "fixture-v1",
  },
  executiveWithoutFinance: {
    actorUserId: EXECUTIVE_TEST_IDS.financeDenied,
    membershipId: "40000000-0000-4000-8000-000000000003",
    source: "canonical_membership",
    scope: {
      kind: "organization",
      organizationId: EXECUTIVE_TEST_IDS.organization,
    },
    permissions: ["executive.overview.read"],
    authorizationVersion: "fixture-v1",
  },
  organizationAdmin: {
    actorUserId: EXECUTIVE_TEST_IDS.administrator,
    membershipId: "40000000-0000-4000-8000-000000000004",
    source: "canonical_membership",
    scope: {
      kind: "organization",
      organizationId: EXECUTIVE_TEST_IDS.organization,
    },
    permissions: ["theme.administer"],
    authorizationVersion: "fixture-v1",
  },
  mediaRightsOperator: {
    actorUserId: EXECUTIVE_TEST_IDS.mediaRightsOperator,
    membershipId: "40000000-0000-4000-8000-000000000005",
    source: "canonical_membership",
    scope: {
      kind: "team",
      organizationId: EXECUTIVE_TEST_IDS.organization,
      teamId: EXECUTIVE_TEST_IDS.team,
    },
    permissions: ["rights.read", "rights.review", "assignment.create"],
    authorizationVersion: "fixture-v1",
  },
  financeOperator: {
    actorUserId: EXECUTIVE_TEST_IDS.financeOperator,
    membershipId: "40000000-0000-4000-8000-000000000006",
    source: "canonical_membership",
    scope: {
      kind: "organization",
      organizationId: EXECUTIVE_TEST_IDS.organization,
    },
    permissions: ["financial.summary.read", "financial.exception.read"],
    authorizationVersion: "fixture-v1",
  },
  outOfScopeMember: {
    actorUserId: EXECUTIVE_TEST_IDS.unauthorized,
    membershipId: "40000000-0000-4000-8000-000000000007",
    source: "canonical_membership",
    scope: {
      kind: "organization",
      organizationId: EXECUTIVE_TEST_IDS.otherOrganization,
    },
    permissions: ["executive.overview.read"],
    authorizationVersion: "fixture-v1",
  },
} as const satisfies Record<string, ResolvedEnterpriseGrants>;

export const EXECUTIVE_REQUIRED_SCENARIOS = [
  "rights blocker",
  "approval required",
  "financial exception",
  "high-value opportunity",
  "active activation",
  "overloaded member",
  "intelligence recommendation",
  "resolved item",
  "empty scope",
  "restricted user",
] as const;
