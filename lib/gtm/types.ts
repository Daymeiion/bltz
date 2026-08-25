export const GTM_CONTACT_TYPES = [
  "enterprise",
  "athlete",
  "multiplier",
  "unclassified",
] as const;

export type GtmContactType = (typeof GTM_CONTACT_TYPES)[number];

export const GTM_PRIORITY_TIERS = ["A", "B", "C", "D"] as const;

export type GtmPriorityTier = (typeof GTM_PRIORITY_TIERS)[number];

export const GTM_PIPELINE_STAGES = [
  "unqualified",
  "identified",
  "qualified",
  "discovery",
  "demo",
  "pilot",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type GtmPipelineStage = (typeof GTM_PIPELINE_STAGES)[number];

export const GTM_NOTE_TYPES = [
  "general",
  "call",
  "meeting",
  "linkedin",
  "email",
  "introduction",
  "research",
  "personal_context",
  "opportunity",
  "discovery",
] as const;

export type GtmNoteType = (typeof GTM_NOTE_TYPES)[number];

export const GTM_INTERACTION_TYPES = [
  "linkedin",
  "email",
  "phone",
  "video_call",
  "meeting",
  "event",
  "introduction",
  "other",
] as const;

export type GtmInteractionType = (typeof GTM_INTERACTION_TYPES)[number];

export const GTM_INTERACTION_DIRECTIONS = [
  "inbound",
  "outbound",
  "mutual",
] as const;

export type GtmInteractionDirection =
  (typeof GTM_INTERACTION_DIRECTIONS)[number];

export const GTM_RELATIONSHIP_TYPES = [
  "knows",
  "worked_with",
  "teammate",
  "former_teammate",
  "school_alumni",
  "introduced_by",
  "can_introduce",
  "advisor",
  "investor",
  "agent",
  "client",
  "partner",
  "employee",
] as const;

export type GtmRelationshipType = (typeof GTM_RELATIONSHIP_TYPES)[number];

export const GTM_OPPORTUNITY_TYPES = [
  "enterprise_pilot",
  "enterprise_contract",
  "locker_activation",
  "brand_partnership",
  "media_partnership",
  "investment",
  "strategic_partnership",
  "introduction",
] as const;

export type GtmOpportunityType = (typeof GTM_OPPORTUNITY_TYPES)[number];

export const GTM_IMPORT_TYPES = [
  "linkedin_connections",
  "player_master",
  "contacts_csv",
] as const;

export type GtmImportType = (typeof GTM_IMPORT_TYPES)[number];

export const GTM_IMPORT_STATUSES = [
  "uploaded",
  "mapping",
  "validating",
  "preview_ready",
  "committing",
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
] as const;

export type GtmImportStatus = (typeof GTM_IMPORT_STATUSES)[number];

export const GTM_PLAYER_MATCH_TYPES = [
  "linkedin_url",
  "stable_identifier",
  "name_and_team",
  "name_and_college",
  "name_only",
  "manual",
] as const;

export type GtmPlayerMatchType = (typeof GTM_PLAYER_MATCH_TYPES)[number];

export interface GtmContactSummary {
  id: string;
  displayName: string;
  contactType: GtmContactType;
  organizationId: string | null;
  priorityScore: number | null;
  priorityTier: GtmPriorityTier | null;
  pipelineStage: GtmPipelineStage;
  doNotAutomate: boolean;
  lastInteractionAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
}
