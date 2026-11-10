import "server-only";
import { z } from "zod";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

const text = z.string().trim().min(1);
const briefSchema = z.object({
  summary: text,
  archive: text,
  cohort: text,
  preferredPartner: text,
  duration: text,
  proofTitle: text,
  proofDetails: text,
  proofRights: text,
  timeline: z.tuple([text, text, text, text]),
});

export async function getVeritonePilotBrief() {
  const profile = await getCurrentAuthorizationProfile();
  const value = process.env.BLTZ_VERITONE_PILOT_BRIEF;
  if (profile?.role !== "admin" || !value) return null;

  try {
    const result = briefSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
