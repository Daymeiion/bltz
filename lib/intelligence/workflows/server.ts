import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { getIntelligenceWorkflowEnvironment, workflowCommandSchema, workflowMutationResultSchema, workflowReadSchema, type WorkflowSummary } from "./contracts";

export class WorkflowError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
async function authorizeWorkflowContext() {
  await authorizeIntelligenceLab();
  const environment = getIntelligenceWorkflowEnvironment();
  if (!environment) throw new WorkflowError(503, "development_workflows_disabled");
  // The existing shared gate intentionally returns no user object. Revalidate the
  // session to obtain its trusted actor; no browser-supplied actor is accepted.
  const session = await createClient();
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) throw new IntelligenceAccessError(401);
  const permission = await session.rpc("is_internal_admin");
  if (permission.error) throw new IntelligenceAccessError(503);
  if (permission.data !== true) throw new IntelligenceAccessError(403);
  return { actorId: data.user.id, environment };
}

export async function authorizeWorkflowActor() {
  return (await authorizeWorkflowContext()).actorId;
}

export async function mutateWorkflow(input: unknown) {
  const { actorId, environment } = await authorizeWorkflowContext();
  const parsed = workflowCommandSchema.safeParse(input);
  if (!parsed.success) throw new WorkflowError(400, "invalid_workflow_command");
  const service = createServiceClient();
  const result = environment === "development"
    ? await service.rpc("mutate_intelligence_workflow", { p_actor_id: actorId, p_command: parsed.data })
    : await service.rpc("mutate_intelligence_workflow_in_environment", { p_actor_id: actorId, p_command: parsed.data, p_environment: environment });
  if (result.error) {
    const message = String(result.error.message ?? "");
    const code = message.match(/\b(revision_conflict|command_identity_collision|opportunity_identity_collision|terminal_review_decision_preserved|readiness_blocked|opportunity_ready_required|opportunity_expired|opportunity_not_actionable|activation_cancelled|rights_and_publishing_adapter_unavailable|accepted_opportunity_required|current_asset_review_required|verified_moment_relationship_required|verified_evidence_context_required|engine_run_context_mismatch|engine_signal_lineage_mismatch|asset_athlete_relationship_required|activation_asset_context_mismatch)\b/)?.[1];
    if (code) throw new WorkflowError(code === "revision_conflict" ? 409 : 422, code);
    throw new WorkflowError(503, "workflow_persistence_unavailable");
  }
  const acknowledgment = workflowMutationResultSchema.safeParse(result.data);
  if (!acknowledgment.success) throw new WorkflowError(503, "workflow_persistence_unavailable");
  // Legacy development acknowledgments did not carry environment. Production
  // never accepts an unscoped or mismatched persisted acknowledgment.
  const recordEnvironment = result.data && typeof result.data === "object" && "record" in result.data
    && result.data.record && typeof result.data.record === "object" && "environment" in result.data.record
    ? result.data.record.environment : undefined;
  if ((environment === "production" && recordEnvironment !== environment)
    || (recordEnvironment !== undefined && recordEnvironment !== environment)) throw new WorkflowError(503, "workflow_persistence_unavailable");
  return acknowledgment.data;
}

export async function loadWorkflows(playerId: string): Promise<WorkflowSummary> {
  const { environment } = await authorizeWorkflowContext();
  const service = createServiceClient();
  const result = environment === "development"
    ? await service.rpc("read_intelligence_workflows", { p_player_id: playerId })
    : await service.rpc("read_intelligence_workflows_in_environment", { p_player_id: playerId, p_environment: environment });
  const parsed = workflowReadSchema.safeParse(result.data);
  if (result.error || !parsed.success) throw new WorkflowError(503, "workflow_persistence_unavailable");
  const rows = parsed.data;
  if (Object.values(rows).some(records => records.some(record => (record.environment ?? "development") !== environment))) throw new WorkflowError(503, "workflow_persistence_unavailable");
  return { environment, opportunities: rows.opportunities.slice(0, 100), activations: rows.activations.slice(0, 100), momentAssetLinks: rows.momentAssetLinks.slice(0, 100), history: rows.history.slice(0, 100),
    truncated: Object.values(rows).some((value) => value.length > 100),
    measurementState: "unavailable", publishingState: "blocked_adapter_unavailable" };
}
