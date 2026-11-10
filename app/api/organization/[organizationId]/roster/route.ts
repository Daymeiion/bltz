import { API_HEADERS, apiError, authorizeWrite } from "@/lib/enterprise-crm/pilot/api";
import { addAthleteInput, addRosterAthlete } from "@/lib/enterprise-crm/pilot/roster-athletes";

export const dynamic = "force-dynamic";

/** Adds a player the master list does not have (another sport, never in the NFL) to the roster. */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const auth = await authorizeWrite(request, organizationId, "activation.manage");
  if (!auth.ok) return auth.response;
  const parsed = addAthleteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  try {
    const athlete = await addRosterAthlete(auth.context.organization.id, auth.context.userId, parsed.data);
    return Response.json({ state: "created", athlete }, { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
