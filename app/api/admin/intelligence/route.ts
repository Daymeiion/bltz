import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { loadIntelligenceWorkspace } from "@/lib/intelligence/workspace-server";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};

/** Read-only internal endpoint. The loader authorizes before any service-role read. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = {
    q: query.get("q") ?? undefined,
    athlete: query.get("athlete") ?? undefined,
    asOf: query.get("asOf") ?? undefined,
  };
  // Bound untrusted input before passing it to the already-authorized reader.
  if ((params.q?.length ?? 0) > 120 || (params.athlete?.length ?? 0) > 100 || (params.asOf?.length ?? 0) > 10) {
    return Response.json({ error: "Search parameters are too long." }, { status: 400, headers });
  }
  try {
    return Response.json(await loadIntelligenceWorkspace(params), { headers });
  } catch (error) {
    const status = error instanceof IntelligenceAccessError ? error.status : 503;
    const message = status === 401 ? "Sign in to access Intelligence Lab." : status === 403 ? "Internal admin access required." : "Intelligence data is temporarily unavailable.";
    return Response.json({ error: message }, { status, headers });
  }
}
