import { z } from "zod";

export const workflowEnvironmentSchema = z.enum(["development", "production"]);
export type WorkflowEnvironment = z.infer<typeof workflowEnvironmentSchema>;

const uuid = z.string().uuid();
const common = { commandId: uuid, reason: z.string().trim().min(1).max(2000) };
const editing = { id: uuid, expectedRevision: z.number().int().positive() };
const nullableTime = z.string().datetime({ offset: true }).nullable();
export const opportunityStates = ["candidate", "in_review", "ready", "accepted", "dismissed", "expired"] as const;
export const intendedUses = ["internal_review", "public_display", "social_publication", "license", "print", "commercial_campaign"] as const;
export const proposedBrandSchema = z.object({ name: z.string().trim().min(1).max(120), status: z.literal("proposed") }).strict();
const activationFields = {
  title: z.string().trim().min(1).max(400), description: z.string().trim().min(1).max(4000),
  proposedBrands: z.array(proposedBrandSchema).max(8).default([]), intendedUse: z.enum(intendedUses),
  releaseAt: nullableTime.default(null),
};

export const workflowCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("register_opportunity"),
    opportunityKey: z.string().trim().min(1).max(800), playerId: uuid, momentId: uuid.nullable().default(null),
    runId: uuid.nullable().default(null), ruleVersion: z.string().trim().min(1).max(80),
    signalKeys: z.array(z.string().trim().min(1).max(800)).min(1).max(32), evidenceIds: z.array(uuid).max(64).default([]),
    inputSnapshot: z.record(z.string(), z.unknown()), title: z.string().trim().min(1).max(400),
    explanation: z.string().trim().min(1).max(4000), expiresAt: nullableTime.default(null),
  }).strict(),
  z.object({ ...common, ...editing, action: z.literal("review_opportunity"), state: z.enum(opportunityStates),
    assigneeId: uuid.nullable().optional(), readinessBlockers: z.array(z.string().trim().min(1).max(240)).max(24).optional(),
  }).strict(),
  z.object({ ...common, action: z.literal("review_asset_link"), id: uuid.optional(), expectedRevision: z.number().int().positive().optional(),
    playerId: uuid, momentId: uuid, legacyMediaId: uuid.nullable().default(null), legacyVideoId: uuid.nullable().default(null),
    status: z.enum(["verified", "rejected"]), evidenceIds: z.array(uuid).min(1).max(64),
  }).strict(),
  z.object({ ...common, ...activationFields, action: z.literal("create_activation"), opportunityId: uuid }).strict(),
  z.object({ ...common, ...editing, ...activationFields, action: z.literal("edit_activation"), assetLinkIds: z.array(uuid).max(16).default([]) }).strict(),
  z.object({ ...common, ...editing, action: z.literal("transition_activation"),
    state: z.enum(["draft", "awaiting_approvals", "paused", "cancelled", "approved", "scheduled", "live", "completed"]),
  }).strict(),
]).superRefine((command, context) => {
  if (command.action === "review_asset_link") {
    if (!!command.legacyMediaId === !!command.legacyVideoId) context.addIssue({ code: "custom", message: "Exactly one qualified legacy asset is required." });
    if (!!command.id !== !!command.expectedRevision) context.addIssue({ code: "custom", message: "Existing links require an optimistic revision." });
  }
  if (command.action === "register_opportunity") {
    if (!command.runId && !command.evidenceIds.length) context.addIssue({ code: "custom", message: "Preserved run or reviewed evidence lineage is required." });
    if (new TextEncoder().encode(JSON.stringify(command.inputSnapshot)).byteLength > 32768) context.addIssue({ code: "custom", message: "Input snapshot is too large." });
  }
});
export type WorkflowCommand = z.infer<typeof workflowCommandSchema>;
export type IntendedUse = (typeof intendedUses)[number];

export const opportunityRecordSchema = z.object({
  id: uuid, environment: workflowEnvironmentSchema, opportunity_key: z.string(), player_id: uuid, moment_id: uuid.nullable(),
  run_id: uuid.nullable(), rule_version: z.string(), signal_keys: z.array(z.string()), evidence_ids: z.array(uuid),
  title: z.string(), explanation: z.string(), state: z.enum(opportunityStates),
  readiness_blockers: z.array(z.string()), assignee_id: uuid.nullable(), expires_at: z.string().nullable(),
  revision: z.number().int().positive(), updated_at: z.string(),
});
export const activationRecordSchema = z.object({
  id: uuid, environment: workflowEnvironmentSchema.optional(), opportunity_id: uuid, title: z.string(), description: z.string(), proposed_brands: z.array(proposedBrandSchema),
  intended_use: z.enum(intendedUses), release_at: z.string().nullable(), state: z.enum(["draft", "awaiting_approvals", "paused", "cancelled"]),
  owner_id: uuid, revision: z.number().int().positive(), review_approved_revision: z.number().int().positive().nullable(),
  metrics: z.null(), updated_at: z.string(), asset_link_ids: z.array(uuid),
  current_media_review_valid: z.boolean(), publishing_allowed: z.literal(false),
});
export const momentAssetLinkRecordSchema = z.object({
  id: uuid, environment: workflowEnvironmentSchema, player_id: uuid, moment_id: uuid,
  legacy_media_id: uuid.nullable(), legacy_video_id: uuid.nullable(), status: z.enum(["verified", "rejected"]),
  evidence_ids: z.array(uuid), review_reason: z.string(), reviewed_by: uuid, revision: z.number().int().positive(),
  updated_at: z.string(), current_display_eligible: z.boolean(),
});
export const workflowReadSchema = z.object({
  opportunities: z.array(opportunityRecordSchema), activations: z.array(activationRecordSchema),
  momentAssetLinks: z.array(momentAssetLinkRecordSchema), history: z.array(z.object({
    id: uuid, environment: workflowEnvironmentSchema.optional(), opportunity_id: uuid.nullable(), activation_id: uuid.nullable(), moment_asset_link_id: uuid.nullable(),
    actor_id: uuid, action: z.string(), reason: z.string(), revision: z.number().int().positive(), created_at: z.string(),
  })),
}).strict();
export type OpportunityRecord = z.infer<typeof opportunityRecordSchema>;
export type ActivationRecord = z.infer<typeof activationRecordSchema>;
export type MomentAssetLinkRecord = z.infer<typeof momentAssetLinkRecordSchema>;
export type WorkflowHistoryRecord = z.infer<typeof workflowReadSchema>["history"][number];
export const workflowMutationResultSchema = z.object({
  record: z.object({ id: uuid, revision: z.number().int().positive(),
    state: z.enum([...opportunityStates, "draft", "awaiting_approvals", "paused", "cancelled"]).optional(),
    status: z.enum(["verified", "rejected"]).optional(),
  }), duplicate: z.boolean(),
});
export type WorkflowMutationResult = z.infer<typeof workflowMutationResultSchema>;

/** Workflow DTOs contain reviewed state; they never imply rights or earnings. */
export interface WorkflowSummary {
  environment?: WorkflowEnvironment;
  opportunities: OpportunityRecord[];
  activations: ActivationRecord[];
  momentAssetLinks: MomentAssetLinkRecord[];
  history: WorkflowHistoryRecord[];
  measurementState: "unavailable";
  publishingState: "blocked_adapter_unavailable";
  truncated: boolean;
}

/** Server configuration selects the scope; browser commands cannot override it. */
export function getIntelligenceWorkflowEnvironment(env: Readonly<Partial<NodeJS.ProcessEnv>> = process.env): WorkflowEnvironment | null {
  if (env.BLTZ_INTELLIGENCE_WORKFLOWS_ENABLED !== "true") return null;
  if (env.BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT === "development" && env.VERCEL_ENV !== "production") return "development";
  if (env.BLTZ_INTELLIGENCE_WORKFLOWS_ENVIRONMENT === "production" && env.VERCEL_ENV === "production"
    && env.BLTZ_INTELLIGENCE_WORKFLOWS_PRODUCTION_ENABLED === "true") return "production";
  return null;
}

export function intelligenceWorkflowsEnabled(env: Readonly<Partial<NodeJS.ProcessEnv>> = process.env): boolean {
  return getIntelligenceWorkflowEnvironment(env) !== null;
}

export function developmentWorkflowsEnabled(env: Readonly<Partial<NodeJS.ProcessEnv>> = process.env): boolean {
  return getIntelligenceWorkflowEnvironment(env) === "development";
}
