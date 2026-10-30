import { NextRequest, NextResponse } from "next/server";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "@/lib/companyManager";
import { getActiveCompanyId } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const companies = getCompanies();
    const activeCompanyId = request.cookies.get("rasa_aruna_company")?.value || "default";
    const activeCompany = getCompanyById(activeCompanyId);

    return NextResponse.json({
      companies,
      activeCompanyId,
      activeCompany,
    });
  } catch (error: any) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, brand, city, description, adminName, adminEmail, adminPassword, cloneMode } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nama Perusahaan wajib diisi." },
        { status: 400 }
      );
    }

    const newCompany = await createCompany({
      name: name.trim(),
      brand: (brand && brand.trim()) || name.trim(),
      city: city ? city.trim() : "Jakarta",
      description: description ? description.trim() : undefined,
      adminName: adminName ? adminName.trim() : undefined,
      adminEmail: adminEmail ? adminEmail.trim() : undefined,
      adminPassword: adminPassword || "password123",
      cloneMode: cloneMode === "sample" ? "sample" : "clean",
    });

    const response = NextResponse.json({
      success: true,
      message: `Perusahaan '${newCompany.name}' berhasil dibuat!`,
      company: newCompany,
    });

    // Auto-switch to newly created company
    response.cookies.set("rasa_aruna_company", newCompany.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat perusahaan baru." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, brand, city, description, address, taxRate } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID Perusahaan wajib disertakan." },
        { status: 400 }
      );
    }

    const updated = updateCompany(id, {
      ...(name ? { name: name.trim() } : {}),
      ...(brand ? { brand: brand.trim() } : {}),
      ...(city ? { city: city.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(address !== undefined ? { address: address.trim() } : {}),
      ...(taxRate !== undefined ? { taxRate: Number(taxRate) } : {}),
    });

    return NextResponse.json({
      success: true,
      message: `Data perusahaan '${updated.name}' berhasil diperbarui.`,
      company: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/companies error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui data perusahaan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID Perusahaan wajib disertakan." },
        { status: 400 }
      );
    }

    if (id === "default") {
      return NextResponse.json(
        { error: "Perusahaan baseline bawaan (PT Rasa Aruna Bersama) tidak boleh dihapus." },
        { status: 400 }
      );
    }

    const success = deleteCompany(id);
    if (!success) {
      return NextResponse.json(
        { error: "Perusahaan tidak ditemukan." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Perusahaan berhasil dihapus.",
    });

    // If active company was the deleted one, reset to default
    const activeCompanyId = request.cookies.get("rasa_aruna_company")?.value;
    if (activeCompanyId === id) {
      response.cookies.set("rasa_aruna_company", "default", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: any) {
    console.error("DELETE /api/companies error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus perusahaan." },
      { status: 500 }
    );
  }
}
