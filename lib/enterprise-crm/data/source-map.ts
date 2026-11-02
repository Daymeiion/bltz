export type ExecutiveSourceDisposition =
  | "canonical"
  | "partial_unsafe"
  | "missing";

export interface ExecutiveSourceMapping {
  concept: string;
  disposition: ExecutiveSourceDisposition;
  existingSources: readonly string[];
  boundary: string;
}

export const EXECUTIVE_SOURCE_MAP = [
  {
    concept: "Organization / school identity",
    disposition: "canonical",
    existingSources: ["public.organizations", "public.schools"],
    boundary: "organizations.school_id is the identity reference; validate dataset coverage and use safe theme fallback",
  },
  {
    concept: "Team / scope",
    disposition: "canonical",
    existingSources: ["public.teams"],
    boundary: "only rows with the requested organization_id may participate in CRM scope",
  },
  {
    concept: "Membership / permission",
    disposition: "partial_unsafe",
    existingSources: ["public.organization_memberships", "public.platform_role_assignments"],
    boundary: "membership is canonical; explicit permission and team-grant persistence are not approved",
  },
  {
    concept: "Athlete summary",
    disposition: "canonical",
    existingSources: ["public.players", "public.athlete_team_seasons", "public.team_seasons"],
    boundary: "derive tenant/team membership through organization-bound roster records and omit private athlete fields",
  },
  {
    concept: "Opportunity",
    disposition: "missing",
    existingSources: [],
    boundary: "no approved canonical model or vocabulary",
  },
  {
    concept: "Activation",
    disposition: "missing",
    existingSources: [],
    boundary: "no approved canonical model or vocabulary",
  },
  {
    concept: "Media / rights",
    disposition: "partial_unsafe",
    existingSources: ["public.media"],
    boundary: "legacy media carries player/license workflow data but lacks an organization-owned Executive rights boundary",
  },
  {
    concept: "Financial exception",
    disposition: "partial_unsafe",
    existingSources: [
      "public.admin_revenue_summary",
      "public.platform_revenue",
      "public.publisher_revenue",
      "public.revenue_distributions",
    ],
    boundary: "legacy revenue tables are not tenant-scoped Financial Exception truth and must not feed Executive payloads",
  },
  {
    concept: "Intelligence signal",
    disposition: "partial_unsafe",
    existingSources: ["public.athlete_insights"],
    boundary: "beta intelligence is athlete-linked and internal-admin-only, without approved tenant scope/provenance contract",
  },
  {
    concept: "Assignment / task",
    disposition: "missing",
    existingSources: [],
    boundary: "no approved canonical model, priority/status vocabulary, or atomic mutation contract",
  },
  {
    concept: "Notification",
    disposition: "missing",
    existingSources: [],
    boundary: "messaging records are not an approved Executive notification model",
  },
  {
    concept: "Audit event",
    disposition: "canonical",
    existingSources: ["public.audit_logs"],
    boundary: "append-only service contract; reuse existing fields and safe metadata only",
  },
  {
    concept: "Executive projection",
    disposition: "missing",
    existingSources: [],
    boundary: "must be derived from authorized canonical sources after source models are approved",
  },
] as const satisfies readonly ExecutiveSourceMapping[];
