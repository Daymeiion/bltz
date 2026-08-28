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
      .from("site_configuration")
      .select("*")
      .single();

    if (error) {
      // If table doesn't exist or no data, return default values
      if (error.code === "PGRST116" || error.message.includes("relation") || error.message.includes("does not exist")) {
        console.log("Site configuration table not found, returning default values");
        return NextResponse.json({
          site_name: "BLTZ Platform",
          site_description: "The ultimate social media platform for athletes and fans",
          site_url: "https://bltz.com",
          maintenance_mode: false,
          registration_enabled: true,
          public_registration: true,
          default_user_role: "fan",
          max_file_size: 10,
          allowed_file_types: ["jpg", "jpeg", "png", "mp4", "mov"],
          timezone: "America/New_York",
          language: "en",
          theme: "dark",
        });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching site configuration:", error);
    return NextResponse.json({ error: "Failed to fetch site configuration" }, { status: 500 });
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

    // Try to update first
    const { data: updateData, error: updateError } = await supabase
      .from("site_configuration")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      // If table doesn't exist, try to insert
      if (updateError.code === "PGRST116" || updateError.message.includes("relation") || updateError.message.includes("does not exist")) {
        console.log("Site configuration table not found, attempting to create with default values");
        
        const defaultData = {
          site_name: "BLTZ Platform",
          site_description: "The ultimate social media platform for athletes and fans",
          site_url: "https://bltz.com",
          maintenance_mode: false,
          registration_enabled: true,
          public_registration: true,
          default_user_role: "fan",
          max_file_size: 10,
          allowed_file_types: ["jpg", "jpeg", "png", "mp4", "mov"],
          timezone: "America/New_York",
          language: "en",
          theme: "dark",
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const { data: insertData, error: insertError } = await supabase
          .from("site_configuration")
          .insert(defaultData)
          .select()
          .single();

        if (insertError) {
          console.log("Cannot insert into site_configuration table, returning updated data");
          return NextResponse.json({ ...defaultData });
        }

        return NextResponse.json(insertData);
      }
      throw updateError;
    }

    return NextResponse.json(updateData);
  } catch (error) {
    console.error("Error updating site configuration:", error);
    return NextResponse.json({ error: "Failed to update site configuration" }, { status: 500 });
  }
}
