import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

export const runtime = "nodejs";

const documents = {
  "one-sheet": "getty-one-sheet.pdf",
  workflow: "getty-image-workflow.pdf",
} as const;

export async function GET(request: Request) {
  // Route handlers do not inherit the admin layout's authorization.
  const profile = await getCurrentAuthorizationProfile();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!profile) return new Response("Unauthorized", { status: 401, headers });
  if (profile.role !== "admin") return new Response("Forbidden", { status: 403, headers });

  const document = new URL(request.url).searchParams.get("document");
  if (document !== "one-sheet" && document !== "workflow") {
    return new Response("Unknown document", { status: 404, headers });
  }
  const filename = documents[document];
  const bytes = await readFile(join(process.cwd(), "app/admin/getty-partnership/_documents", filename));
  return new Response(new Uint8Array(bytes), { headers: {
    ...headers,
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="BLTZ-${filename}"`,
  } });
}
