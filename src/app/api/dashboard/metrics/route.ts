import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextResponse } from "next/server";
import { getOperationalDashboardMetrics } from "@/lib/dashboardEngine";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const metrics = await getOperationalDashboardMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
