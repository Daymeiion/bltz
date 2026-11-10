import "server-only";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { seedRosterFromMasterList } from "./roster-athletes";

export const PILOT_PERMISSIONS = ["executive.overview.read", "intelligence.read", "activation.read", "activation.manage"] as const;

export const applicationInput = z.object({
  organizationKind: z.enum(["school_athletics", "nil_agency"]),
  organizationName: z.string().trim().min(2).max(200),
  collegeDirectoryId: z.number().int().positive().nullable(),
  applicantName: z.string().trim().min(2).max(120),
  applicantEmail: z.string().trim().toLowerCase().email().max(254),
  applicantTitle: z.string().trim().max(120).nullish().transform((value) => value || null),
  message: z.string().trim().max(1000).nullish().transform((value) => value || null),
  // Honeypot: real people leave it empty.
  website: z.string().max(0).optional().or(z.literal("")),
}).strict().refine((value) => value.organizationKind !== "school_athletics" || value.collegeDirectoryId !== null, { path: ["collegeDirectoryId"] });
export type ApplicationInput = z.infer<typeof applicationInput>;

export type PilotApplication = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationKind: "school_athletics" | "nil_agency";
  collegeName: string | null;
  masterListCollege: string | null;
  applicantName: string;
  applicantEmail: string;
  applicantTitle: string | null;
  message: string | null;
  status: "pending" | "approved" | "declined";
  /** A school address is a good sign, not proof: BLTZ still approves by hand. */
  schoolEmail: boolean;
  createdAt: string;
};

/** Saves the application with its organization in "pending review". Applying twice with the same email and name is a no-op. */
export async function submitApplication(input: ApplicationInput): Promise<{ state: "received" }> {
  const db = createServiceClient();
  const existing = await db.from("organization_applications").select("id,organization_id,organizations!inner(name)")
    .eq("status", "pending").eq("applicant_email", input.applicantEmail).limit(20);
  const rows = (existing.data ?? []) as unknown as Array<{ organizations: { name: string } }>;
  if (rows.some((row) => row.organizations.name.trim().toLowerCase() === input.organizationName.toLowerCase())) return { state: "received" };

  const organization = await db.from("organizations").insert({ name: input.organizationName, organization_type: input.organizationKind, status: "pending_review" }).select("id").single();
  if (organization.error || !organization.data) throw new Error("application_failed");
  const application = await db.from("organization_applications").insert({
    organization_id: (organization.data as { id: string }).id, organization_kind: input.organizationKind,
    college_directory_id: input.organizationKind === "school_athletics" ? input.collegeDirectoryId : null,
    applicant_name: input.applicantName, applicant_email: input.applicantEmail, applicant_title: input.applicantTitle, message: input.message,
  });
  if (application.error) throw new Error("application_failed");
  return { state: "received" };
}

const applicationRow = z.object({
  id: z.string(), organization_id: z.string(), organization_kind: z.enum(["school_athletics", "nil_agency"]), college_directory_id: z.number().nullable(),
  master_list_college: z.string().nullable(), applicant_name: z.string(), applicant_email: z.string(), applicant_title: z.string().nullable(),
  message: z.string().nullable(), status: z.enum(["pending", "approved", "declined"]), created_at: z.string(),
});
const COLUMNS = "id,organization_id,organization_kind,college_directory_id,master_list_college,applicant_name,applicant_email,applicant_title,message,status,created_at";

/** Applications, newest first, for BLTZ admins. Caller must be an internal admin. */
export async function listApplications(limit = 100): Promise<{ state: "ready" | "unavailable"; applications: PilotApplication[] }> {
  try {
    const db = createServiceClient();
    const { data, error } = await db.from("organization_applications").select(COLUMNS).order("created_at", { ascending: false }).limit(limit);
    const parsed = z.array(applicationRow).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", applications: [] };
    const orgIds = parsed.data.map((row) => row.organization_id);
    const collegeIds = [...new Set(parsed.data.flatMap((row) => row.college_directory_id ?? []))];
    const [orgs, colleges] = await Promise.all([
      orgIds.length ? db.from("organizations").select("id,name").in("id", orgIds) : Promise.resolve({ data: [] }),
      collegeIds.length ? db.from("Colleges").select("id,canonical_name").in("id", collegeIds) : Promise.resolve({ data: [] }),
    ]);
    const orgName = new Map(((orgs.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
    const collegeName = new Map(((colleges.data ?? []) as Array<{ id: number; canonical_name: string }>).map((row) => [row.id, row.canonical_name]));
    return { state: "ready", applications: parsed.data.map((row) => ({
      id: row.id, organizationId: row.organization_id, organizationName: orgName.get(row.organization_id) ?? "Organization", organizationKind: row.organization_kind,
      collegeName: row.college_directory_id ? collegeName.get(row.college_directory_id) ?? null : null, masterListCollege: row.master_list_college,
      applicantName: row.applicant_name, applicantEmail: row.applicant_email, applicantTitle: row.applicant_title, message: row.message, status: row.status,
      schoolEmail: /\.edu$/i.test(row.applicant_email), createdAt: row.created_at,
    })) };
  } catch {
    return { state: "unavailable", applications: [] };
  }
}

export const decisionInput = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve"), masterListCollege: z.string().trim().max(200).nullish().transform((value) => value || null) }).strict(),
  z.object({ decision: z.literal("decline"), note: z.string().trim().max(500).nullish().transform((value) => value || null) }).strict(),
]);

export type DecisionResult =
  | { state: "approved"; rosterAdded: number }
  | { state: "declined" }
  | { state: "not_found" | "already_decided" | "applicant_not_confirmed" | "failed" };

function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "school";
}

/** Finds or creates the school row for a college directory entry, so the workspace picks up its colors and logo. */
async function schoolForCollege(collegeId: number): Promise<string | null> {
  const db = createServiceClient();
  const linked = await db.from("schools").select("id").eq("college_directory_id", collegeId).limit(1).maybeSingle();
  if (linked.data) return (linked.data as { id: string }).id;
  const college = await db.from("Colleges").select("canonical_name,logo_url,city,state").eq("id", collegeId).maybeSingle();
  const row = college.data as { canonical_name: string; logo_url: string | null; city: string | null; state: string | null } | null;
  if (!row) return null;
  const byName = await db.from("schools").select("id").ilike("name", row.canonical_name).limit(1).maybeSingle();
  if (byName.data) {
    const id = (byName.data as { id: string }).id;
    await db.from("schools").update({ college_directory_id: collegeId }).eq("id", id);
    return id;
  }
  const created = await db.from("schools").insert({ name: row.canonical_name, slug: `${slugify(row.canonical_name)}-${collegeId}`, logo_url: row.logo_url, city: row.city, state: row.state, college_directory_id: collegeId }).select("id").single();
  return created.data ? (created.data as { id: string }).id : null;
}

/**
 * Approve: the applicant's confirmed account becomes the organization's owner with the pilot
 * permissions, the college's branding is linked, and the roster is built from the master list.
 * Decline: the organization is marked rejected. Each step is safe to run again.
 */
export async function decideApplication(applicationId: string, actorUserId: string, input: z.infer<typeof decisionInput>): Promise<DecisionResult> {
  const db = createServiceClient();
  const found = await db.from("organization_applications").select(COLUMNS).eq("id", applicationId).maybeSingle();
  const parsed = applicationRow.safeParse(found.data);
  if (!parsed.success) return { state: "not_found" };
  const application = parsed.data;
  if (application.status !== "pending") return { state: "already_decided" };
  const reviewed = { reviewed_by: actorUserId, reviewed_at: new Date().toISOString() };

  if (input.decision === "decline") {
    await db.from("organizations").update({ status: "rejected", updated_at: reviewed.reviewed_at }).eq("id", application.organization_id);
    const { error } = await db.from("organization_applications").update({ status: "declined", review_note: input.note, ...reviewed }).eq("id", applicationId).eq("status", "pending");
    return error ? { state: "failed" } : { state: "declined" };
  }

  const account = await db.rpc("pilot_user_id_by_email", { p_email: application.applicant_email });
  const userId = typeof account.data === "string" ? account.data : null;
  if (!userId) return { state: "applicant_not_confirmed" };

  try {
    const schoolId = application.college_directory_id ? await schoolForCollege(application.college_directory_id) : null;
    const organization = await db.from("organizations").update({ status: "approved", ...(schoolId ? { school_id: schoolId } : {}), updated_at: reviewed.reviewed_at }).eq("id", application.organization_id);
    if (organization.error) return { state: "failed" };

    const membership = await db.from("organization_memberships")
      .upsert({ organization_id: application.organization_id, user_id: userId, role: "owner", status: "active", created_by: actorUserId }, { onConflict: "organization_id,user_id" })
      .select("id").single();
    if (membership.error || !membership.data) return { state: "failed" };
    for (const key of PILOT_PERMISSIONS) {
      const grant = await db.rpc("grant_enterprise_permission", { p_membership_id: (membership.data as { id: string }).id, p_permission_key: key, p_actor_user_id: actorUserId, p_reason: "Pilot application approved" });
      if (grant.error) return { state: "failed" };
    }
    // New accounts start as athletes, which would send staff into athlete onboarding.
    await db.from("profiles").update({ role: "fan" }).eq("id", userId).eq("role", "player").is("player_id", null);

    const rosterAdded = input.masterListCollege ? await seedRosterFromMasterList(application.organization_id, input.masterListCollege, actorUserId) : 0;
    const { error } = await db.from("organization_applications").update({ status: "approved", master_list_college: input.masterListCollege, ...reviewed }).eq("id", applicationId).eq("status", "pending");
    return error ? { state: "failed" } : { state: "approved", rosterAdded };
  } catch {
    return { state: "failed" };
  }
}

/** The applicant's own pending applications, so the workspace entry can say "being reviewed". */
export async function pendingApplicationsFor(email: string): Promise<Array<{ organizationName: string; createdAt: string }>> {
  try {
    const db = createServiceClient();
    const { data } = await db.from("organization_applications").select("organization_id,created_at").eq("status", "pending").eq("applicant_email", email.trim().toLowerCase()).limit(5);
    const rows = (data ?? []) as Array<{ organization_id: string; created_at: string }>;
    if (!rows.length) return [];
    const orgs = await db.from("organizations").select("id,name").in("id", rows.map((row) => row.organization_id));
    const name = new Map(((orgs.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
    return rows.map((row) => ({ organizationName: name.get(row.organization_id) ?? "Your organization", createdAt: row.created_at }));
  } catch {
    return [];
  }
}

/** College names in the master list that could be this school, with how many players each has. */
export async function masterListCollegeOptions(hint: string): Promise<Array<{ name: string; players: number }>> {
  // "University of California-Berkeley" in the directory is "California" in the master list: search on the longest plain word.
  const word = hint.split(/[^A-Za-z]+/).filter((part) => !/^(university|college|of|the|athletics|state|at)$/i.test(part)).sort((a, b) => b.length - a.length)[0];
  if (!word || word.length < 3) return [];
  try {
    const { data } = await createServiceClient().from("nfl_players").select("college_name").ilike("college_name", `%${word.replace(/[%_,]/g, "")}%`).limit(5000);
    const counts = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ college_name: string | null }>) {
      for (const part of (row.college_name ?? "").split(";").map((value) => value.trim()).filter(Boolean)) {
        if (part.toLowerCase().includes(word.toLowerCase())) counts.set(part, (counts.get(part) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([name, players]) => ({ name, players })).sort((a, b) => b.players - a.players).slice(0, 8);
  } catch {
    return [];
  }
}
