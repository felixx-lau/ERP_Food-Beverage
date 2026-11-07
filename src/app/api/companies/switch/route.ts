import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { getCompanyById } from "@/lib/companyManager";

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId wajib disertakan." },
        { status: 400 }
      );
    }

    const company = getCompanyById(companyId);

    const response = NextResponse.json({
      success: true,
      message: `Beralih ke perusahaan '${company.name}' (${company.brand})`,
      activeCompany: company,
    });

    response.cookies.delete("rasa_aruna_session");
    response.cookies.set("rasa_aruna_company", company.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/companies/switch error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal beralih perusahaan." },
      { status: 500 }
    );
  }
}
