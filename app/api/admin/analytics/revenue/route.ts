import { NextResponse } from "next/server";
import { getRevenueData } from "@/lib/queries/analytics";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";

export async function GET() {
  try {
    const profile = await getCurrentAuthorizationProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getRevenueData();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}

