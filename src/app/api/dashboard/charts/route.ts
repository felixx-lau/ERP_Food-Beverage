import { NextRequest, NextResponse } from "next/server";
import { getDashboardChartMetrics, ChartFilterParams } from "@/lib/dashboardEngine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const period = (periodParam === "week" || periodParam === "month" || periodParam === "day")
      ? periodParam
      : "day";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getDashboardChartMetrics({
      period,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Dashboard chart metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load dashboard chart metrics",
      },
      { status: 500 }
    );
  }
}
