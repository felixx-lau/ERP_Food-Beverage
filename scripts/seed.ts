import { PrismaClient } from "@prisma/client";
import { executeSeed } from "../src/lib/seedData";

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_BASELINE_REPLACE !== 'I_UNDERSTAND_THIS_REPLACES_DATA') throw new Error('Baseline seed mengganti semua data target. Gunakan verify_isolated.py untuk pengujian. Untuk reset yang disengaja, backup database dan set ALLOW_BASELINE_REPLACE=I_UNDERSTAND_THIS_REPLACES_DATA.');
  console.log("🌱 Executing Baseline Seed for Rasa Aruna Kitchen ERP...");
  const result = await executeSeed(prisma, "CLI Seed Runner");
  console.log("✅ Seed complete:", JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
