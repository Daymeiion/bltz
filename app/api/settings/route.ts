import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error fetching settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    return NextResponse.json(settings || null);
  } catch (error) {
    console.error("Error in settings GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      twitter_handle,
      instagram_handle,
      linkedin_handle,
      youtube_handle,
      tiktok_handle
    } = body;

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let result;
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from("user_settings")
        .update({
          twitter_handle,
          instagram_handle,
          linkedin_handle,
          youtube_handle,
          tiktok_handle,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
      }
      result = data;
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          twitter_handle,
          instagram_handle,
          linkedin_handle,
          youtube_handle,
          tiktok_handle
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating settings:", error);
        return NextResponse.json({ error: "Failed to create settings" }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in settings POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
