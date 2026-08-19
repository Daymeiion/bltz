import { NextRequest, NextResponse } from "next/server";
import { getEngagementMetrics } from "@/lib/queries/analytics";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentAuthorizationProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    const data = await getEngagementMetrics(days);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagement metrics" },
      { status: 500 }
    );
  }
}

