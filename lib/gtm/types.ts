export const GTM_CONTACT_TYPES = [
  "athlete",
  "former_athlete",
  "agent_manager",
  "nil_staff",
  "university_athletics",
  "player_development",
  "athletic_administration",
  "coach",
  "sports_executive",
  "media_content",
  "photographer_videographer",
  "brand_marketing",
  "creative_brand_builder",
  "investor",
  "founder_operator",
  "strategic_partner",
  "general_network",
  "other",
  // Legacy values remain selectable so existing V1 records stay editable.
  "enterprise",
  "multiplier",
  "unclassified",
] as const;

export type GtmContactType = (typeof GTM_CONTACT_TYPES)[number];

export const GTM_POTENTIAL_ROLES = [
  "potential_user",
  "pilot_champion",
  "buyer",
  "decision_maker",
  "decision_influencer",
  "internal_connector",
  "referral_source",
  "distribution_partner",
  "strategic_partner",
  "product_discovery",
  "product_validator",
  "industry_expert",
  "content_partner",
  "media_rights_partner",
  "brand_partner",
  "investor",
  "investor_connector",
  "advisor",
  "athlete_recruiter",
  "university_connector",
] as const;

export type GtmPotentialRole = (typeof GTM_POTENTIAL_ROLES)[number];

export const GTM_RELATIONSHIP_OBJECTIVES = [
  "customer_discovery",
  "user_acquisition",
  "pilot_development",
  "product_validation",
  "institutional_discovery",
  "partnership_development",
  "distribution",
  "investor_relationship",
  "fundraising_discovery",
  "referral_generation",
  "media_rights_discovery",
  "brand_relationship",
  "strategic_learning",
  "relationship_building",
  "re_engagement",
] as const;

export type GtmRelationshipObjective =
  (typeof GTM_RELATIONSHIP_OBJECTIVES)[number];

export const GTM_RELATIONSHIP_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export type GtmRelationshipPriority =
  (typeof GTM_RELATIONSHIP_PRIORITIES)[number];

export const GTM_INVESTOR_TYPES = [
  "angel",
  "athlete_angel",
  "operator_angel",
  "pre_seed_vc",
  "seed_vc",
  "sports_vc",
  "consumer_vc",
  "media_vc",
  "strategic_corporate_vc",
  "family_office",
] as const;

export type GtmInvestorType = (typeof GTM_INVESTOR_TYPES)[number];

export const GTM_INVESTOR_RELATIONSHIP_STAGES = [
  "existing_relationship",
  "introduction",
  "discovery",
  "product_shown",
  "interested",
  "milestone_follow_up",
  "intro_offered",
  "potential_check",
  "diligence",
  "passed",
  "future_round",
] as const;

export type GtmInvestorRelationshipStage =
  (typeof GTM_INVESTOR_RELATIONSHIP_STAGES)[number];

export const GTM_CONVERSATION_OUTCOMES = [
  "user_conversion",
  "pilot_opportunity",
  "capital",
  "referral",
  "strategic_insight",
  "product_validation",
  "distribution_opportunity",
  "partnership",
  "future_follow_up",
  "no_fit",
] as const;

export type GtmConversationOutcome =
  (typeof GTM_CONVERSATION_OUTCOMES)[number];

export const GTM_PRIORITY_TIERS = ["A", "B", "C", "D"] as const;

export type GtmPriorityTier = (typeof GTM_PRIORITY_TIERS)[number];

export const GTM_PIPELINE_STAGES = [
  "identified",
  "connected",
  "engaged",
  "discovery",
  "demo_candidate",
  "pilot_candidate",
  "active_pilot",
  "converted",
  "nurture",
  "not_now",
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
  contactTypeOther: string | null;
  potentialRoles: GtmPotentialRole[];
  relationshipObjective: GtmRelationshipObjective | null;
  relationshipPriority: GtmRelationshipPriority | null;
  relationshipContext: string | null;
  organizationId: string | null;
  priorityScore: number | null;
  priorityTier: GtmPriorityTier | null;
  pipelineStage: GtmPipelineStage;
  doNotAutomate: boolean;
  lastInteractionAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  nextTrigger: string | null;
}
