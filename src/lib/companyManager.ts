import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

export interface Company {
  id: string;
  name: string;
  brand: string;
  dbFile: string;
  isDefault?: boolean;
  description?: string;
  city?: string;
  address?: string;
  currency?: string;
  taxRate?: number;
  createdAt: string;
}

export const DEFAULT_COMPANY: Company = {
  id: "default",
  name: "PT Rasa Aruna Bersama",
  brand: "Rasa Aruna Kitchen",
  dbFile: "erp.db",
  isDefault: true,
  description: "Baseline Skenario Kuliah ERP F&B Group 03",
  city: "Jakarta",
  currency: "IDR",
  taxRate: 10,
  createdAt: "2026-10-20T00:00:00.000Z",
};

export function getPrismaDir(): string {
  const candidate1 = path.join(process.cwd(), "prisma");
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.join(process.cwd(), "ERP_Food-Beverage", "prisma");
  if (fs.existsSync(candidate2)) return candidate2;
  return candidate1;
}

export function getCompaniesFilePath(): string {
  return path.join(getPrismaDir(), "companies.json");
}

export function getCompaniesDir(): string {
  const dir = path.join(getPrismaDir(), "companies");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
  return dir;
}

export function getCompanies(): Company[] {
  const filePath = getCompaniesFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(data) as Company[];
      if (Array.isArray(list) && list.length > 0) {
        // Ensure default company is present
        if (!list.find((c) => c.id === "default")) {
          list.unshift(DEFAULT_COMPANY);
        }
        return list;
      }
    }
  } catch (err) {
    console.error("Error reading companies.json:", err);
  }

  // Initialize companies.json with default company
  const initial = [DEFAULT_COMPANY];
  saveCompanies(initial);
  return initial;
}

export function saveCompanies(companies: Company[]): void {
  const filePath = getCompaniesFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(companies, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving companies.json:", err);
  }
}

export function getCompanyById(id: string): Company {
  const companies = getCompanies();
  return companies.find((c) => c.id === id) || companies[0] || DEFAULT_COMPANY;
}

export function getDatabasePathForCompany(company: Company): string {
  const prismaDir = getPrismaDir();
  if (company.id === "default" || !company.dbFile || company.dbFile === "erp.db") {
    return path.join(prismaDir, "erp.db");
  }

  // If company.dbFile starts with companies/ or is a relative path
  if (path.isAbsolute(company.dbFile)) {
    return company.dbFile;
  }
  return path.join(prismaDir, company.dbFile);
}

export async function createCompany(params: {
  name: string;
  brand: string;
  city?: string;
  description?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
  cloneMode?: "clean" | "sample";
}): Promise<Company> {
  const companies = getCompanies();
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const companyId = `comp_${slug || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const relativeDbPath = path.join("companies", `${companyId}.db`);

  const prismaDir = getPrismaDir();
  const sourceDbPath = path.join(prismaDir, "erp.db");
  const targetDbPath = path.join(prismaDir, relativeDbPath);

  // Ensure target folder exists
  getCompaniesDir();

  // Copy baseline SQLite database as the schema template
  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`Baseline database not found at ${sourceDbPath}`);
  }
  fs.copyFileSync(sourceDbPath, targetDbPath);

  // If clean mode, clear all demo/transactional data so user starts from scratch
  if (params.cloneMode !== "sample") {
    const tempClient = new PrismaClient({
      datasourceUrl: `file:${targetDbPath}`,
    });

    try {
      await tempClient.auditLog.deleteMany();
      await tempClient.internalTransferLine.deleteMany();
      await tempClient.internalTransfer.deleteMany();
      await tempClient.creditNoteLine.deleteMany();
      await tempClient.creditNote.deleteMany();
      await tempClient.returnRequestLine.deleteMany();
      await tempClient.returnRequest.deleteMany();
      await tempClient.posOrderLine.deleteMany();
      await tempClient.posOrder.deleteMany();
      await tempClient.posSession.deleteMany();
      await tempClient.payment.deleteMany();
      await tempClient.vendorBillLine.deleteMany();
      await tempClient.vendorBill.deleteMany();
      await tempClient.customerInvoiceLine.deleteMany();
      await tempClient.customerInvoice.deleteMany();
      await tempClient.goodsReceiptLine.deleteMany();
      await tempClient.goodsReceipt.deleteMany();
      await tempClient.purchaseOrderLine.deleteMany();
      await tempClient.purchaseOrder.deleteMany();
      await tempClient.deliveryOrderLine.deleteMany();
      await tempClient.deliveryOrder.deleteMany();
      await tempClient.salesOrderLine.deleteMany();
      await tempClient.salesOrder.deleteMany();
      await tempClient.crmLead.deleteMany();
      await tempClient.journalItem.deleteMany();
      await tempClient.journalEntry.deleteMany();
      await tempClient.stockMove.deleteMany();
      await tempClient.stockLevel.deleteMany();
      await tempClient.productVariant.deleteMany();
      await tempClient.contact.deleteMany();

      // If user specified custom admin credentials, register them
      if (params.adminEmail && params.adminName) {
        const hashedPassword = await bcrypt.hash(params.adminPassword || "password123", 10);
        const existing = await tempClient.user.findUnique({
          where: { email: params.adminEmail },
        });

        if (existing) {
          await tempClient.user.update({
            where: { email: params.adminEmail },
            data: {
              name: params.adminName,
              passwordHash: hashedPassword,
              role: Role.OWNER,
            },
          });
        } else {
          await tempClient.user.create({
            data: {
              name: params.adminName,
              email: params.adminEmail,
              passwordHash: hashedPassword,
              role: Role.OWNER,
            },
          });
        }
      }
    } finally {
      await tempClient.$disconnect();
    }
  }

  const newCompany: Company = {
    id: companyId,
    name: params.name,
    brand: params.brand || params.name,
    dbFile: relativeDbPath,
    isDefault: false,
    city: params.city || "Jakarta",
    description: params.description || `Perusahaan Kustom: ${params.name}`,
    currency: "IDR",
    taxRate: 10,
    createdAt: new Date().toISOString(),
  };

  companies.push(newCompany);
  saveCompanies(companies);

  return newCompany;
}

export function updateCompany(
  id: string,
  data: Partial<Omit<Company, "id" | "dbFile" | "isDefault">>
): Company {
  const companies = getCompanies();
  const index = companies.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`Company with id ${id} not found.`);
  }

  const updated: Company = {
    ...companies[index],
    ...data,
  };

  companies[index] = updated;
  saveCompanies(companies);
  return updated;
}

export function deleteCompany(id: string): boolean {
  if (id === "default") {
    throw new Error("Perusahaan default (PT Rasa Aruna Bersama) tidak boleh dihapus.");
  }

  const companies = getCompanies();
  const company = companies.find((c) => c.id === id);
  if (!company) return false;

  // Try to remove database file if it exists
  try {
    const dbPath = getDatabasePathForCompany(company);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (err) {
    console.error(`Failed to delete database file for company ${id}:`, err);
  }

  const filtered = companies.filter((c) => c.id !== id);
  saveCompanies(filtered);
  return true;
}
