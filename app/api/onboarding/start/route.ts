import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { startRun } from "@/lib/pipeline/run";

export const runtime = "nodejs";

const Body = z.object({
  full_name: z.string().min(2).max(120),
  school: z.string().max(160).optional().nullable(),
  position: z.string().max(60).optional().nullable(),
  level: z.enum(["hs", "college", "pro", "former"]).optional().nullable(),
  cohort_year: z.number().int().min(1950).max(2100).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "invalid_input", detail: e?.message }, { status: 400 });
  }

  const { runId } = await startRun({ userId: user.id, identity: body });
  return NextResponse.json({ runId });
}
