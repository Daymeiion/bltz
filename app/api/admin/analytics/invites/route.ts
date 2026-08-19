import { NextResponse } from "next/server";
import { getInviteAnalytics } from "@/lib/queries/analytics";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

export async function GET() {
  try {
    const profile = await getCurrentAuthorizationProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getInviteAnalytics();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching invite analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite analytics" },
      { status: 500 }
    );
  }
}

