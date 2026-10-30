import { PrismaClient, Role, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedDemoChartsData(client = prisma) {
  console.log("📊 Menghasilkan Dataset Historis Demo untuk Dashboard Charts...");

  // Pastikan kontak dan produk ada
  const contacts = await client.contact.findMany();
  const products = await client.productVariant.findMany();
  let defaultCashier = await client.user.findFirst({ where: { role: Role.CASHIER } });
  if (!defaultCashier) {
    defaultCashier = await client.user.findFirst();
  }

  if (products.length === 0 || !defaultCashier) {
    console.error("❌ Produk atau User tidak ditemukan. Jalankan seed baseline terlebih dahulu.");
    return { success: false, message: "Produk atau User tidak ditemukan." };
  }

  const customerList = contacts.filter((c) => c.type === "CUSTOMER");
  const vendorList = contacts.filter((c) => c.type === "VENDOR");

  const fallbackCustomer = customerList[0] || { id: "C01", name: "PT Boga Kuliner" };
  const fallbackVendor = vendorList[0] || { id: "V01", name: "PT Sumber Pangan" };

  // Dapatkan atau buat sesi kasir POS
  let session = await client.posSession.findFirst({ where: { locationCode: "CAFE-JKT" } });
  if (!session) {
    session = await client.posSession.create({
      data: {
        sessionCode: `POS-DEMO-${Date.now().toString().slice(-4)}`,
        cashierId: defaultCashier?.id || "cashier-demo",
        locationCode: "CAFE-JKT",
        status: "OPEN",
        openingCash: 500000,
      },
    });
  }

  const now = new Date();
  let createdSoCount = 0;
  let createdPosCount = 0;
  let createdPoCount = 0;

  // 1. Buat data penjualan historis selama 30 hari terakhir
  // Tiap beberapa hari dibuat variasi penjualan SO dan POS
  for (let daysAgo = 28; daysAgo >= 0; daysAgo -= 2) {
    const txnDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = txnDate.toISOString().slice(0, 10).replace(/-/g, "");

    // 1A. POS Order harian (Kasir Kafe)
    const randomProd1 = products[daysAgo % products.length];
    const randomProd2 = products[(daysAgo + 3) % products.length];
    const qty1 = (daysAgo % 4) + 1;
    const qty2 = ((daysAgo + 1) % 3) + 1;
    const net1 = qty1 * randomProd1.salesPrice;
    const net2 = qty2 * randomProd2.salesPrice;
    const pbjt1 = Math.round(net1 * 0.1);
    const pbjt2 = Math.round(net2 * 0.1);
    const totalPos = net1 + pbjt1 + net2 + pbjt2;
    const costPos = (qty1 * randomProd1.standardCost) + (qty2 * randomProd2.standardCost);

    const posOrderNumber = `POS/DEMO/${dateStr}/${daysAgo}`;
    const existingPos = await client.posOrder.findUnique({ where: { orderNumber: posOrderNumber } });

    if (!existingPos) {
      await client.posOrder.create({
        data: {
          orderNumber: posOrderNumber,
          sessionId: session.id,
          locationCode: "CAFE-JKT",
          orderDate: txnDate,
          tableInfo: daysAgo % 2 === 0 ? "Takeaway" : "Dine-in Meja 04",
          status: "PAID",
          subtotalNet: net1 + net2,
          pbjtTax: pbjt1 + pbjt2,
          totalAmount: totalPos,
          totalCost: costPos,
          paymentMethod: daysAgo % 3 === 0 ? "CASH" : "QRIS / Bank",
          isPosted: true,
          lines: {
            create: [
              {
                productSku: randomProd1.sku,
                quantity: qty1,
                unitPrice: randomProd1.salesPrice,
                netPrice: net1,
                pbjtAmount: pbjt1,
                totalAmount: net1 + pbjt1,
                standardCost: randomProd1.standardCost,
              },
              {
                productSku: randomProd2.sku,
                quantity: qty2,
                unitPrice: randomProd2.salesPrice,
                netPrice: net2,
                pbjtAmount: pbjt2,
                totalAmount: net2 + pbjt2,
                standardCost: randomProd2.standardCost,
              },
            ],
          },
        },
      });
      createdPosCount++;
    }

    // 1B. Corporate Sales Order (SO) tiap interval 4 hari
    if (daysAgo % 4 === 0) {
      const cust = customerList[daysAgo % customerList.length] || fallbackCustomer;
      const soNumber = `SO/DEMO/${dateStr}/${daysAgo}`;
      const existingSo = await client.salesOrder.findUnique({ where: { orderNumber: soNumber } });

      if (!existingSo) {
        const soProd = products.find((p) => p.sku.startsWith("RICE-")) || products[0];
        const soQty = 6 + (daysAgo % 5) * 2;
        const soNet = soQty * soProd.salesPrice;
        const soPbjt = Math.round(soNet * 0.1);
        const soGross = soNet + soPbjt;
        const soCost = soQty * soProd.standardCost;

        await client.salesOrder.create({
          data: {
            orderNumber: soNumber,
            contactId: cust.id,
            orderDate: txnDate,
            status: OrderStatus.CONFIRMED,
            subtotalNet: soNet,
            pbjtTax: soPbjt,
            totalGross: soGross,
            projectedCost: soCost,
            isPriceLocked: true,
            lines: {
              create: [
                {
                  productSku: soProd.sku,
                  quantity: soQty,
                  unitPrice: soProd.salesPrice,
                  discountPercent: 0,
                  netPrice: soNet,
                  pbjtAmount: soPbjt,
                  totalAmount: soGross,
                  standardCost: soProd.standardCost,
                  deliveredQty: soQty,
                },
              ],
            },
          },
        });
        createdSoCount++;
      }
    }
  }

  // 2. Buat data pengadaan pembelian bulanan (Purchase Orders)
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const poDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 10);
    const poMonthStr = `${poDate.getFullYear()}${String(poDate.getMonth() + 1).padStart(2, "0")}`;
    const poNumber = `PO/DEMO/${poMonthStr}`;

    const existingPo = await client.purchaseOrder.findUnique({ where: { poNumber } });
    if (!existingPo) {
      const vend = vendorList[monthsAgo % vendorList.length] || fallbackVendor;
      const targetProd = products[(monthsAgo * 2) % products.length];
      const poQty = 20 + monthsAgo * 5;
      const poSubtotal = poQty * targetProd.standardCost;

      await client.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: vend.id,
          orderDate: poDate,
          scheduledDate: poDate,
          status: OrderStatus.DONE,
          subtotal: poSubtotal,
          taxAmount: 0,
          total: poSubtotal,
          lines: {
            create: [
              {
                productSku: targetProd.sku,
                orderedQty: poQty,
                unitPrice: targetProd.standardCost,
                subtotal: poSubtotal,
                receivedQty: poQty,
                billedQty: poQty,
              },
            ],
          },
        },
      });
      createdPoCount++;
    }
  }

  console.log(`✅ Demo Charts Dataset Berhasil Dimuat:`);
  console.log(`   - ${createdPosCount} Transaksi POS Baru`);
  console.log(`   - ${createdSoCount} Sales Order Korporat Baru`);
  console.log(`   - ${createdPoCount} Purchase Order Pembelian Baru`);

  return {
    success: true,
    message: "Dataset demo chart berhasil dimuat.",
    stats: {
      posOrdersCreated: createdPosCount,
      salesOrdersCreated: createdSoCount,
      purchaseOrdersCreated: createdPoCount,
    },
  };
}

// Eksekusi jika dipanggil langsung via CLI
if (process.argv[1]?.includes("seed_demo_charts")) {
  seedDemoChartsData()
    .catch((err) => {
      console.error("Gagal memuat demo charts data:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
