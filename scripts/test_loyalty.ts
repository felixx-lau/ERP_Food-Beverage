import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { createPosOrder, openPosSession } from '../src/lib/posEngine';
import { refundPosOrder } from '../src/lib/posRefund';

async function main() {
  await executeSeed(prisma);
  const cashier = await prisma.user.findFirstOrThrow({where:{role:'CASHIER'}});
  const actor = {id:cashier.id,name:cashier.name,role:cashier.role};
  const customer = await prisma.contact.findFirstOrThrow({where:{type:'CUSTOMER'}});
  const account = await prisma.loyaltyAccount.create({data:{contactId:customer.id}});
  const coupon = await prisma.promotionCoupon.create({data:{code:'TEST-SR20',discountAmount:10000}});
  const session = await openPosSession({cashierId:cashier.id,actor});
  const lines = [{productSku:'COF-LATT-HOT',quantity:2},{productSku:'COOKIE-CHO-1',quantity:2}];
  const result = await createPosOrder({sessionId:session.id,lines,actor,loyaltyAccountId:account.id,couponCode:coupon.code});
  assert.equal(result.order.subtotalNet,90000); assert.equal(result.order.pbjtTax,9000); assert.equal(result.order.totalAmount,99000);
  assert.equal((await prisma.loyaltyAccount.findUniqueOrThrow({where:{id:account.id}})).points,9);
  assert.equal((await prisma.promotionCoupon.findUniqueOrThrow({where:{id:coupon.id}})).usedOrderId,result.order.id);
  assert.equal(result.journalEntry.items.reduce((n,i)=>n+i.debit-i.credit,0),0);
  await assert.rejects(createPosOrder({sessionId:session.id,lines,actor,couponCode:coupon.code}));
  assert.equal((await prisma.loyaltyAccount.findUniqueOrThrow({where:{id:account.id}})).points,9);
  await refundPosOrder(result.order.id,'Tes refund',actor);
  assert.equal((await prisma.loyaltyAccount.findUniqueOrThrow({where:{id:account.id}})).points,0);
  assert.equal((await prisma.promotionCoupon.findUniqueOrThrow({where:{id:coupon.id}})).usedOrderId,result.order.id);
  console.log('[PASS] SR-20 points, discounted tax, journal, single-use coupon and refund');
}
main().catch(e=>{console.error('[FAIL]',e);process.exitCode=1});
