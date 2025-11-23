import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const supabase = await createClient();

    // Check if user has access to this message
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("id, recipient_id, sender_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user is the recipient
    if (message.recipient_id !== profile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mark message as read
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq("id", messageId);

    if (updateError) {
      console.error("Error marking message as read:", updateError);
      return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in mark message as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
