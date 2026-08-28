import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const profile = await getCurrentAuthorizationProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_management_settings")
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user management settings:", error);
    return NextResponse.json({ error: "Failed to fetch user management settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getCurrentAuthorizationProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();
    const updates = await request.json();

    const { data, error } = await supabase
      .from("user_management_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating user management settings:", error);
    return NextResponse.json({ error: "Failed to update user management settings" }, { status: 500 });
  }
}
