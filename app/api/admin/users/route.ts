import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Temporary fix: Return empty users array until database is set up
    return NextResponse.json({ users: [] });
  } catch (error) {
    console.error("Error in admin users GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
