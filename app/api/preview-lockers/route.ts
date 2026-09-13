import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isInternalAdmin } from "@/lib/rbac";
import { slugify } from "@/lib/preview-lockers/slug";

export const runtime = "nodejs";

const TeamPill = z.object({ label: z.string(), color: z.string(), logo: z.string().nullable() });

const Body = z.object({
  slug: z.string().min(3).max(48).optional(),
  full_name: z.string().min(2).max(120),
  position: z.string().max(60).nullable().optional(),
  level: z.enum(["hs", "college", "pro", "former"]).nullable().optional(),
  school: z.string().max(160).nullable().optional(),
  hometown: z.string().max(160).nullable().optional(),
  jersey: z.string().max(10).nullable().optional(),
  height_in: z.number().int().min(40).max(96).nullable().optional(),
  weight_lbs: z.number().int().min(60).max(450).nullable().optional(),
  dob: z.string().nullable().optional(),
  games_played: z.number().int().min(0).max(1000).nullable().optional(),
  headshot_url: z.string().url().nullable().optional(),
  hero_video_url: z.string().url().nullable().optional(),
  bio: z.string().max(4000).optional(),
  athlete_quote: z.string().max(600).nullable().optional(),
  athlete_quote_author: z.string().max(160).nullable().optional(),
  schools: z.array(TeamPill).optional(),
  pro_teams: z.array(TeamPill).optional(),
  awards: z.array(z.object({ year: z.string(), label: z.string() })).optional(),
  videos: z
    .array(z.object({ id: z.string(), title: z.string(), thumb: z.string().nullable(), url: z.string().nullable() }))
    .optional(),
  photos: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        title: z.string(),
        credits: z.string().nullable(),
        sourceUrl: z.string().nullable(),
        level: z.enum(["hs", "cfb", "pro", "off-field"]),
        season: z.string().nullable(),
      }),
    )
    .optional(),
  source: z.record(z.string(), z.unknown()).optional(),
  pipeline_run_id: z.string().uuid().nullable().optional(),
});

const SCHOOL_SELECT =
  "display_name, abbreviation, primary_color, logo_url, logo_dark_url";

async function buildSchoolInfo(school: string | null | undefined) {
  if (!school) return null;
  const sb = createServiceClient();
  const { data } = await sb
    .from("cfb_teams")
    .select(SCHOOL_SELECT)
    .ilike("display_name", `%${school}%`)
    .maybeSingle();
  if (data) {
    return {
      name: data.display_name ?? school,
      abbr: data.abbreviation || school.slice(0, 3).toUpperCase(),
      primaryColor: data.primary_color || "#1A3DCC",
      logoUrl: data.logo_url ?? data.logo_dark_url ?? null,
    };
  }
  return {
    name: school,
    abbr: school.slice(0, 3).toUpperCase(),
    primaryColor: "#1A3DCC",
    logoUrl: null,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isInternalAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "invalid_input", detail }, { status: 400 });
  }

  const sb = createServiceClient();
  const baseSlug = slugify(body.slug || body.full_name);
  let slug = baseSlug;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const { data: existing } = await sb
      .from("preview_lockers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  const schoolInfo = await buildSchoolInfo(body.school);

  const { data: inserted, error } = await sb
    .from("preview_lockers")
    .insert({
      slug,
      full_name: body.full_name,
      position: body.position ?? null,
      level: body.level ?? null,
      school: body.school ?? null,
      hometown: body.hometown ?? null,
      jersey: body.jersey ?? null,
      height_in: body.height_in ?? null,
      weight_lbs: body.weight_lbs ?? null,
      dob: body.dob ?? null,
      games_played: body.games_played ?? null,
      headshot_url: body.headshot_url ?? null,
      hero_video_url: body.hero_video_url ?? null,
      bio: body.bio ?? "",
      athlete_quote: body.athlete_quote ?? null,
      athlete_quote_author: body.athlete_quote_author ?? null,
      school_info: schoolInfo,
      schools: schoolInfo
        ? [{ label: schoolInfo.abbr, color: schoolInfo.primaryColor, logo: schoolInfo.logoUrl }]
        : [],
      pro_teams: body.pro_teams ?? [],
      awards: body.awards ?? [],
      videos: body.videos ?? [],
      photos: body.photos ?? [],
      source: body.source ?? {},
      pipeline_run_id: body.pipeline_run_id ?? null,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: "could_not_create", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(inserted);
}
