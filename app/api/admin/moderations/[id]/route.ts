import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const allowed = ["status", "severity", "title", "description", "link"] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("moderations")
      .update(updates)
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, updated: Object.keys(updates) });
  } catch (error) {
    console.error("Error updating moderation:", error);
    return NextResponse.json({ error: "Failed to update moderation" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase
      .from("moderations")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error("Error deleting moderation:", error);
    return NextResponse.json({ error: "Failed to delete moderation" }, { status: 500 });
  }
}


