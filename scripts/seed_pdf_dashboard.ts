/** Rebuild only a disposable dashboard preview from the PDF's independent T-27 fixture. */
import assert from 'node:assert/strict';
import { realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { openPosSession, createPosOrder } from '../src/lib/posEngine';
async function main() {
  const cwd = realpathSync(process.cwd()), temp = realpathSync(os.tmpdir());
  assert(cwd.startsWith(temp + path.sep) && path.basename(cwd).startsWith('aruna-dashboard-demo-'), 'Only a disposable dashboard preview is allowed.');
  assert(realpathSync((process.env.DATABASE_URL || '').replace(/^file:/, '')).startsWith(cwd + path.sep), 'Database must be inside preview.');
  await executeSeed(prisma);
  const prices: Record<string, [number, number]> = {
    'RICE-CHICK-S':[48000,26000], 'RICE-CHICK-L':[62000,34000], 'RICE-BEEF-S':[56000,31000], 'RICE-BEEF-L':[72000,42000],
    'NOOD-VEG-S':[39000,19000], 'NOOD-VEG-L':[52000,27000], 'SALAD-GRN-S':[42000,21000], 'SALAD-GRN-L':[58000,30000],
    'COF-LATT-HOT':[30000,12000], 'COF-LATT-ICE':[33000,13000], 'TEA-LEMN-HOT':[26000,8000], 'TEA-LEMN-ICE':[28000,9000],
    'COOKIE-CHO-1':[20000,9000], 'COOKIE-CHO-3':[54000,25000], 'JUICE-ORN-350':[35000,15000],
  };
  const products = await prisma.productVariant.findMany();
  assert.equal(products.length, 15);
  for (const p of products) assert.deepEqual([p.salesPrice, p.standardCost], prices[p.sku], p.sku);
  const cashier = await prisma.user.findFirstOrThrow({ where: { role:'CASHIER' } });
  const session = await openPosSession({ sessionCode:'POS01', cashierId:cashier.id, openingCash:0, actor:cashier });
  await createPosOrder({ sessionId:session.id, paymentMethod:'QRIS / Bank', lines:[{ productSku:'COF-LATT-HOT', quantity:2 }, { productSku:'COOKIE-CHO-1', quantity:1 }], actor:cashier });
  const order = await prisma.posOrder.findFirstOrThrow();
  assert.deepEqual([order.subtotalNet,order.pbjtTax,order.totalAmount,order.totalCost],[80000,8000,88000,33000]);
  const hot = await prisma.stockLevel.findUniqueOrThrow({ where:{ productSku_locationCode:{productSku:'COF-LATT-HOT',locationCode:'CAFE-JKT'} } });
  const cookie = await prisma.stockLevel.findUniqueOrThrow({ where:{ productSku_locationCode:{productSku:'COOKIE-CHO-1',locationCode:'CAFE-JKT'} } });
  assert.deepEqual([hot.onHand,cookie.onHand],[22,19]);
  assert.equal(await prisma.posOrder.count(),1);
  writeFileSync('pdf-dashboard-evidence.json',JSON.stringify({ fixture:'T-27 only; fresh PDF baseline',transactionDate:order.orderDate,productCount:15,net:order.subtotalNet,tax:order.pbjtTax,total:order.totalAmount,cost:order.totalCost,stock:{hot:hot.onHand,cookie:cookie.onHand}},null,2));
  console.log('[PASS] PDF product prices, T-27 totals, stock and source transaction verified.');
}
main().finally(() => prisma.$disconnect()).catch(e => { console.error(e);process.exitCode=1; });
