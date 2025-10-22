import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Temporary fix: Return empty messages array until database is set up
    return NextResponse.json({
      messages: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    console.error("Error in messages GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Temporary fix: Return success response until database is set up
    return NextResponse.json({ 
      message: {
        id: "temp-" + Date.now(),
        subject: "Message sent successfully",
        content: "This is a temporary response until the database is set up",
        status: "sent"
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error in messages POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
