import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDemoChartsData } from "../../../../../scripts/seed_demo_charts";

export async function POST() {
  try {
    const result = await seedDemoChartsData(prisma as any);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Demo charts seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat data demo chart" },
      { status: 500 }
    );
  }
}
