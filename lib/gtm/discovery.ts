import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const gtmCustomerDiscoveryInputSchema = z.object({
  contactId: z.string().uuid(),
  interactionId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  problemDiscussed: z.string().trim().min(1).max(10_000).nullable().optional(),
  currentSolution: z.string().trim().min(1).max(10_000).nullable().optional(),
  painLevel: z.number().int().min(1).max(5).nullable().optional(),
  primaryBltzUseCase: z.string().trim().min(1).max(5_000).nullable().optional(),
  featureRequested: z.string().trim().min(1).max(10_000).nullable().optional(),
  wouldUse: z.boolean().nullable().optional(),
  wouldPilot: z.boolean().nullable().optional(),
  wouldPay: z.boolean().nullable().optional(),
  expectedBuyer: z.string().trim().min(1).max(1_000).nullable().optional(),
  expectedBudgetRange: z.string().trim().min(1).max(500).nullable().optional(),
  primaryObjection: z.string().trim().min(1).max(10_000).nullable().optional(),
  introductionOffered: z.boolean().nullable().optional(),
  introductionTarget: z.string().trim().min(1).max(2_000).nullable().optional(),
  additionalContext: z.string().trim().min(1).max(20_000).nullable().optional(),
}).superRefine((value, context) => {
  const findingKeys = [
    "problemDiscussed", "currentSolution", "painLevel", "primaryBltzUseCase",
    "featureRequested", "wouldUse", "wouldPilot", "wouldPay", "expectedBuyer",
    "expectedBudgetRange", "primaryObjection", "introductionOffered",
    "introductionTarget", "additionalContext",
  ] as const;
  if (!findingKeys.some((key) => value[key] !== null && value[key] !== undefined)) {
    context.addIssue({ code: "custom", message: "Record at least one discovery finding." });
  }
  if (value.introductionOffered === false && value.introductionTarget) {
    context.addIssue({ code: "custom", message: "An introduction target requires an offered or unknown introduction state." });
  }
});

export type GtmCustomerDiscoveryInput = z.infer<typeof gtmCustomerDiscoveryInputSchema>;

export async function createGtmCustomerDiscovery(input: unknown) {
  const value = gtmCustomerDiscoveryInputSchema.parse(input);
  await requireInternalAdmin();
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("gtm_discovery_unauthorized");

  const gtm = supabase as unknown as SupabaseClient;
  const { data, error } = await gtm.rpc("create_gtm_customer_discovery", {
    p_contact_id: value.contactId,
    p_interaction_id: value.interactionId ?? null,
    p_organization_id: value.organizationId ?? null,
    p_problem_discussed: value.problemDiscussed ?? null,
    p_current_solution: value.currentSolution ?? null,
    p_pain_level: value.painLevel ?? null,
    p_primary_bltz_use_case: value.primaryBltzUseCase ?? null,
    p_feature_requested: value.featureRequested ?? null,
    p_would_use: value.wouldUse ?? null,
    p_would_pilot: value.wouldPilot ?? null,
    p_would_pay: value.wouldPay ?? null,
    p_expected_buyer: value.expectedBuyer ?? null,
    p_expected_budget_range: value.expectedBudgetRange ?? null,
    p_primary_objection: value.primaryObjection ?? null,
    p_introduction_offered: value.introductionOffered ?? null,
    p_introduction_target: value.introductionTarget ?? null,
    p_additional_context: value.additionalContext ?? null,
  });
  if (error || !data) {
    throw new Error(`gtm_discovery_create_failed:${error?.code ?? "empty"}`);
  }
  return Array.isArray(data) ? data[0] : data;
}
