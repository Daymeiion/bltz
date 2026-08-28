import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export interface GtmContactNote {
  id: string;
  noteType: string;
  body: string;
  createdAt: string;
}

export interface GtmContactInteraction {
  id: string;
  interactionType: string;
  direction: string;
  subject: string | null;
  summary: string | null;
  interactionAt: string;
  outcomes: string[];
  nextTrigger: string | null;
  followUpRequired: boolean;
}

export interface GtmCustomerDiscoveryRecord {
  id: string;
  interactionId: string | null;
  organizationId: string | null;
  problemDiscussed: string | null;
  currentSolution: string | null;
  painLevel: number | null;
  primaryBltzUseCase: string | null;
  featureRequested: string | null;
  wouldUse: boolean | null;
  wouldPilot: boolean | null;
  wouldPay: boolean | null;
  expectedBuyer: string | null;
  expectedBudgetRange: string | null;
  primaryObjection: string | null;
  introductionOffered: boolean | null;
  introductionTarget: string | null;
  additionalContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GtmContactRow {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  geography: string | null;
  currentCompany: string | null;
  currentTitle: string | null;
  contactType: string;
  segment: string | null;
  sport: string | null;
  leagueLevel: string | null;
  relationshipStrength: number | null;
  networkLeverage: number | null;
  bltzRelevance: number | null;
  buyingAuthority: number | null;
  timingScore: number | null;
  priorityScore: number | null;
  priorityTier: string | null;
  pipelineStage: string | null;
  source: string | null;
  linkedinUrl: string | null;
  doNotAutomate: boolean;
  isPriority: boolean;
  lastInteractionAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  investorType: string | null;
  investorRelationshipStage: string | null;
  whatTheyNeedToSee: string | null;
  investorThesisFeedback: string | null;
  historicalSignal: string | null;
  futureTrigger: string | null;
  priorOutcome: string | null;
  relationshipSource: string | null;
  nextTrigger: string | null;
  playerMatch: {
    playerId: string;
    playerName: string;
    team: string | null;
    position: string | null;
    level: string | null;
    verified: boolean;
  } | null;
  notes: GtmContactNote[];
  interactions: GtmContactInteraction[];
  discoveries: GtmCustomerDiscoveryRecord[];
}

export interface GtmFoundationMetrics {
  generatedAt: string;
  since: string;
  activeContacts: number;
  linkedinContacts: number;
  classifiedContacts: number;
  priorityContacts: number;
  engagedContacts: number;
  overdueNextActions: number;
  stageCounts: Record<string, number>;
  discoveryRecords: number;
  interactions: number;
}

export interface GtmMetricFrequency {
  value: string;
  count: number;
}

export interface GtmSignalCounts {
  yes: number;
  no: number;
  unknown: number;
}

export interface GtmMetrics {
  generatedAt: string;
  since: string;
  totalContacts: number;
  contactTypeCounts: Record<string, number>;
  segmentCounts: Record<string, number>;
  tierAContacts: number;
  tierBContacts: number;
  priorityContacts: number;
  enterpriseContacts: number;
  athleteContacts: number;
  multiplierContacts: number;
  activeConversations: number;
  contactsNeedingFollowUp: number;
  discoveryConversations: number;
  demoCandidates: number;
  pilotCandidates: number;
  activePilots: number;
  conversions: number;
  playerLinkedContacts: number;
  discoveryAnalysis: {
    problems: GtmMetricFrequency[];
    useCases: GtmMetricFrequency[];
    features: GtmMetricFrequency[];
    objections: GtmMetricFrequency[];
    pilotIntent: GtmSignalCounts;
    willingnessToPay: GtmSignalCounts;
  };
}

export type GtmContactsReadModel =
  | { state: "ready"; contacts: GtmContactRow[]; generatedAt: string }
  | { state: "not_configured"; contacts: []; generatedAt: string }
  | { state: "restricted"; contacts: []; generatedAt: string };

function isMissingRelation(error: { code?: string | null; message?: string | null }) {
  return error.code === "42P01"
    || error.code === "PGRST205"
    || error.message?.includes("schema cache") === true;
}

function isPermissionDenied(error: { code?: string | null }) {
  return error.code === "42501" || error.code === "PGRST301";
}

/** User-scoped read keeps RLS active after the internal-admin check. */
export async function getGtmContacts(): Promise<GtmContactsReadModel> {
  await requireInternalAdmin();
  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const generatedAt = new Date().toISOString();

  const { data, error } = await gtm
    .from("gtm_contacts")
    .select("id,display_name,first_name,last_name,email,phone,geography,current_company,current_title,contact_type,segment,sport,league_level,relationship_strength,network_leverage,bltz_relevance,buying_authority,timing_score,priority_score,priority_tier,pipeline_stage,source,linkedin_url,do_not_automate,is_priority,last_interaction_at,next_action,next_action_at,investor_type,investor_relationship_stage,what_they_need_to_see,investor_thesis_feedback,historical_signal,future_trigger,prior_outcome,relationship_source,next_trigger")
    .eq("archived", false)
    .order("is_priority", { ascending: false })
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    if (isMissingRelation(error)) return { state: "not_configured", contacts: [], generatedAt };
    if (isPermissionDenied(error)) return { state: "restricted", contacts: [], generatedAt };
    throw new Error(`gtm_contacts_query_failed:${error.code ?? "unknown"}`);
  }

  const rawContacts = data ?? [];
  const contactIds = rawContacts.map((contact) => contact.id as string);
  const matchesByContact = new Map<string, GtmContactRow["playerMatch"]>();
  const notesByContact = new Map<string, GtmContactNote[]>();
  const interactionsByContact = new Map<string, GtmContactInteraction[]>();
  const discoveriesByContact = new Map<string, GtmCustomerDiscoveryRecord[]>();

  if (contactIds.length > 0) {
    const [matchesResult, notesResult, interactionsResult, discoveryResult] = await Promise.all([
      gtm.from("gtm_contact_players").select("contact_id,player_id,verified,updated_at").in("contact_id", contactIds).order("verified", { ascending: false }).order("updated_at", { ascending: false }),
      gtm.from("gtm_notes").select("id,contact_id,note_type,body,created_at").in("contact_id", contactIds).order("created_at", { ascending: false }).limit(1000),
      gtm.from("gtm_interactions").select("id,contact_id,interaction_type,direction,subject,summary,interaction_at,outcomes,next_trigger,follow_up_required").in("contact_id", contactIds).order("interaction_at", { ascending: false }).limit(1000),
      gtm.from("gtm_customer_discovery").select("id,contact_id,interaction_id,organization_id,problem_discussed,current_solution,pain_level,primary_bltz_use_case,feature_requested,would_use,would_pilot,would_pay,expected_buyer,expected_budget_range,primary_objection,introduction_offered,introduction_target,additional_context,created_at,updated_at").in("contact_id", contactIds).order("created_at", { ascending: false }).limit(1000),
    ]);

    const rawMatches = matchesResult.error ? [] : (matchesResult.data ?? []);
    const playerIds = [...new Set(rawMatches.map((match) => match.player_id as string))];
    const playersResult = playerIds.length > 0
      ? await gtm.from("players").select("id,name,full_name,display_name,team,position,level").in("id", playerIds)
      : { data: [], error: null };
    const playersById = new Map((playersResult.error ? [] : (playersResult.data ?? [])).map((player) => [player.id as string, player]));
    for (const match of rawMatches) {
      if (!matchesByContact.has(match.contact_id as string)) {
        const player = playersById.get(match.player_id as string);
        matchesByContact.set(match.contact_id as string, {
          playerId: match.player_id as string,
          playerName: String(player?.display_name || player?.full_name || player?.name || "Player record"),
          team: (player?.team as string | null | undefined) ?? null,
          position: (player?.position as string | null | undefined) ?? null,
          level: (player?.level as string | null | undefined) ?? null,
          verified: match.verified === true,
        });
      }
    }
    for (const note of notesResult.error ? [] : (notesResult.data ?? [])) {
      const contactId = note.contact_id as string;
      const notes = notesByContact.get(contactId) ?? [];
      notes.push({ id: note.id as string, noteType: note.note_type as string, body: note.body as string, createdAt: note.created_at as string });
      notesByContact.set(contactId, notes);
    }
    for (const interaction of interactionsResult.error ? [] : (interactionsResult.data ?? [])) {
      const contactId = interaction.contact_id as string;
      const interactions = interactionsByContact.get(contactId) ?? [];
      interactions.push({
        id: interaction.id as string,
        interactionType: interaction.interaction_type as string,
        direction: interaction.direction as string,
        subject: interaction.subject as string | null,
        summary: interaction.summary as string | null,
        interactionAt: interaction.interaction_at as string,
        outcomes: Array.isArray(interaction.outcomes) ? interaction.outcomes as string[] : [],
        nextTrigger: interaction.next_trigger as string | null,
        followUpRequired: interaction.follow_up_required === true,
      });
      interactionsByContact.set(contactId, interactions);
    }
    for (const discovery of discoveryResult.error ? [] : (discoveryResult.data ?? [])) {
      const contactId = discovery.contact_id as string;
      const discoveries = discoveriesByContact.get(contactId) ?? [];
      discoveries.push({
        id: discovery.id as string,
        interactionId: discovery.interaction_id as string | null,
        organizationId: discovery.organization_id as string | null,
        problemDiscussed: discovery.problem_discussed as string | null,
        currentSolution: discovery.current_solution as string | null,
        painLevel: discovery.pain_level as number | null,
        primaryBltzUseCase: discovery.primary_bltz_use_case as string | null,
        featureRequested: discovery.feature_requested as string | null,
        wouldUse: discovery.would_use as boolean | null,
        wouldPilot: discovery.would_pilot as boolean | null,
        wouldPay: discovery.would_pay as boolean | null,
        expectedBuyer: discovery.expected_buyer as string | null,
        expectedBudgetRange: discovery.expected_budget_range as string | null,
        primaryObjection: discovery.primary_objection as string | null,
        introductionOffered: discovery.introduction_offered as boolean | null,
        introductionTarget: discovery.introduction_target as string | null,
        additionalContext: discovery.additional_context as string | null,
        createdAt: discovery.created_at as string,
        updatedAt: discovery.updated_at as string,
      });
      discoveriesByContact.set(contactId, discoveries);
    }
  }

  const contacts: GtmContactRow[] = rawContacts.map((contact) => ({
    id: contact.id as string,
    displayName: (contact.display_name as string | null)
      || [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      || "Unnamed contact",
    firstName: contact.first_name as string | null,
    lastName: contact.last_name as string | null,
    email: contact.email as string | null,
    phone: contact.phone as string | null,
    geography: contact.geography as string | null,
    currentCompany: contact.current_company as string | null,
    currentTitle: contact.current_title as string | null,
    contactType: (contact.contact_type as string | null) ?? "unclassified",
    segment: contact.segment as string | null,
    sport: contact.sport as string | null,
    leagueLevel: contact.league_level as string | null,
    relationshipStrength: contact.relationship_strength as number | null,
    networkLeverage: contact.network_leverage as number | null,
    bltzRelevance: contact.bltz_relevance as number | null,
    buyingAuthority: contact.buying_authority as number | null,
    timingScore: contact.timing_score as number | null,
    priorityScore: contact.priority_score as number | null,
    priorityTier: contact.priority_tier as string | null,
    pipelineStage: contact.pipeline_stage as string | null,
    source: contact.source as string | null,
    linkedinUrl: contact.linkedin_url as string | null,
    doNotAutomate: contact.do_not_automate === true,
    isPriority: contact.is_priority === true,
    lastInteractionAt: contact.last_interaction_at as string | null,
    nextAction: contact.next_action as string | null,
    nextActionAt: contact.next_action_at as string | null,
    investorType: contact.investor_type as string | null,
    investorRelationshipStage: contact.investor_relationship_stage as string | null,
    whatTheyNeedToSee: contact.what_they_need_to_see as string | null,
    investorThesisFeedback: contact.investor_thesis_feedback as string | null,
    historicalSignal: contact.historical_signal as string | null,
    futureTrigger: contact.future_trigger as string | null,
    priorOutcome: contact.prior_outcome as string | null,
    relationshipSource: contact.relationship_source as string | null,
    nextTrigger: contact.next_trigger as string | null,
    playerMatch: contact.contact_type === "athlete"
      ? (matchesByContact.get(contact.id as string) ?? null)
      : null,
    notes: notesByContact.get(contact.id as string) ?? [],
    interactions: interactionsByContact.get(contact.id as string) ?? [],
    discoveries: discoveriesByContact.get(contact.id as string) ?? [],
  }));

  return { state: "ready", contacts, generatedAt };
}

/** RLS-protected aggregate projection; it never materializes private metrics. */
export async function getGtmFoundationMetrics(since?: string | null): Promise<GtmFoundationMetrics> {
  await requireInternalAdmin();
  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("get_gtm_foundation_metrics", {
    p_since: since ?? null,
  });
  if (error) throw new Error(`gtm_metrics_query_failed:${error.code ?? "unknown"}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("gtm_metrics_query_invalid_payload");
  }
  return data as unknown as GtmFoundationMetrics;
}

/** Complete Prompt 3 projection derived from RLS-authorized GTM source rows. */
export async function getGtmMetrics(since?: string | null): Promise<GtmMetrics | null> {
  await requireInternalAdmin();
  const supabase = await createClient();
  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("get_gtm_metrics_v1", {
    p_since: since ?? null,
  });
  if (error) {
    if (error.code === "42883" || error.code === "PGRST202") return null;
    throw new Error(`gtm_metrics_v1_query_failed:${error.code ?? "unknown"}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("gtm_metrics_v1_query_invalid_payload");
  }
  return data as unknown as GtmMetrics;
}
