import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9](-?[a-z0-9])*$/;

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!slug || slug.length < 3 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ available: false, reason: "db_error" });
  }
  return NextResponse.json({ available: !data });
}
