import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    let query = supabase
      .from("moderations")
      .select("id, type, title, description, severity, reported_by, status, link, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Error fetching moderations:", error);
    return NextResponse.json({ error: "Failed to fetch moderations" }, { status: 500 });
  }
}


