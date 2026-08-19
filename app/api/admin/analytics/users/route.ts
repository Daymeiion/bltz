import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/queries/analytics";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

export async function GET() {
  try {
    const profile = await getCurrentAuthorizationProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getUserStats();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

