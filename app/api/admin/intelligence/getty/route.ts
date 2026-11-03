import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { GETTY_HEADERS, gettyResponse, searchGetty } from "@/lib/getty/search";

export const dynamic = "force-dynamic";

/**
 * Read-only Getty editorial search for photos (default) or video (`type=video`),
 * for internal admins only. See `searchGetty` for what is returned.
 */
export async function GET(request: Request) {
  try { await authorizeIntelligenceLab(); }
  catch (error) { return Response.json({ state: "forbidden" }, { status: error instanceof IntelligenceAccessError ? error.status : 403, headers: GETTY_HEADERS }); }
  const params = new URL(request.url).searchParams;
  const phrase = params.get("q")?.trim().slice(0, 80) ?? "";
  if (!phrase) return Response.json({ state: "invalid" }, { status: 400, headers: GETTY_HEADERS });
  return gettyResponse(await searchGetty(phrase, params.get("type") === "video" ? "video" : "image"));
}
