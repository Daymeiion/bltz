import { previewAdmin, json, failure } from "@/lib/preview-lockers/server";
import { adminAwardLibrary } from "@/lib/award-images/server";
export const runtime = "nodejs";
export async function GET() {
  try { const { client } = await previewAdmin(); return json(await adminAwardLibrary(client)); }
  catch (error) { return failure(error); }
}
