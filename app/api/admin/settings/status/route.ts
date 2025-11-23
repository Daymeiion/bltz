import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createClient();
    
    // Check if settings tables exist
    const tables = [
      "site_configuration",
      "user_management_settings", 
      "content_moderation_settings",
      "email_notification_settings",
      "security_settings",
      "system_settings",
      "integration_settings"
    ];

    const tableStatus: Record<string, { exists: boolean; error: string | null }> = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select("id")
          .limit(1);
        
        tableStatus[table] = {
          exists: !error,
          error: error?.message || null
        };
      } catch (err) {
        tableStatus[table] = {
          exists: false,
          error: err instanceof Error ? err.message : "Unknown error"
        };
      }
    }

    const allTablesExist = Object.values(tableStatus).every(status => status.exists);
    
    return NextResponse.json({
      tables: tableStatus,
      allTablesExist,
      setupRequired: !allTablesExist,
      message: allTablesExist 
        ? "All settings tables are properly configured"
        : "Some settings tables are missing. Please run the database setup script."
    });
  } catch (error) {
    console.error("Error checking settings status:", error);
    return NextResponse.json({ 
      error: "Failed to check settings status",
      setupRequired: true 
    }, { status: 500 });
  }
}
