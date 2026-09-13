import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isInternalAdmin } from "@/lib/rbac";

export const runtime = "nodejs";

const VideoInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  thumb: z.string().nullable(),
  url: z.string().nullable(),
});

const Body = z.object({
  bio: z.string().max(4000).optional(),
  athlete_quote: z.string().max(600).nullable().optional(),
  athlete_quote_author: z.string().max(160).nullable().optional(),
  hero_video_url: z.string().url().nullable().optional(),
  headshot_url: z.string().url().nullable().optional(),
  videos: z.array(VideoInput).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "unauthorized" };
  if (!(await isInternalAdmin())) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "invalid_input", detail }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("preview_lockers")
    .update(body)
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "could_not_update", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const sb = createServiceClient();
  const { error } = await sb.from("preview_lockers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "could_not_delete", detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
