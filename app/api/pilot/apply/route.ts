import { applicationInput, submitApplication } from "@/lib/enterprise-crm/pilot/applications";
import { API_HEADERS, apiError, isSameOrigin } from "@/lib/enterprise-crm/pilot/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * A school or NIL agency applies to the pilot. Saves the application for BLTZ to
 * review; nobody gets access until an admin approves. A signed-in applicant always
 * applies with their own account's email.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("forbidden", 403);
  const parsed = applicationInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("invalid", 400);
  // Bots fill the hidden field; answer as if it worked.
  if (parsed.data.website) return Response.json({ state: "received" }, { headers: API_HEADERS });
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase() ?? parsed.data.applicantEmail;
    return Response.json(await submitApplication({ ...parsed.data, applicantEmail: email }), { status: 201, headers: API_HEADERS });
  } catch {
    return apiError("unavailable", 503);
  }
}
