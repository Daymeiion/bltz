import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const supabase = await createClient();

  const query = supabase
    .from("schools")
    .select("id, name")
    .order("name", { ascending: true })
    .limit(8);

  const { data, error } = q
    ? await query.ilike("name", `%${q}%`)
    : await query;

  if (error) {
    return NextResponse.json({ schools: [] }, { status: 200 });
  }
  return NextResponse.json({ schools: data ?? [] });
}
