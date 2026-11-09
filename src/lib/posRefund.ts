import { prisma } from './prisma';
import { atomic } from './atomic';
import { Actor,permit,textValue,BusinessError } from './validation';
import { recordAuditLog } from './audit';
import { getNextSequence } from './sequences';

export async function refundPosOrder(orderId:string,reason:string,actor:Actor) {
  permit(actor,['OWNER','CASHIER']);reason=textValue(reason,'Alasan refund',true,1000);
  return atomic(async()=>{
    const order=await prisma.posOrder.findUnique({where:{id:orderId},include:{lines:true,session:true,refund:true}});
    if(!order)throw new BusinessError('Transaksi POS tidak ditemukan.',404);
    if(actor.role!=='OWNER'&&(order.session.cashierId!==actor.id||order.session.status!=='OPEN'))throw new BusinessError('Refund kasir hanya pada sesi miliknya yang masih terbuka. Hubungi Owner untuk sesi tertutup.',403);
    if(order.refund)return {refund:order.refund,alreadyRefunded:true};
    if(order.status!=='PAID'||!order.isPosted)throw new BusinessError('Hanya transaksi selesai yang dapat direfund.');
    const refund=await prisma.posRefund.create({data:{refundNumber:`POS-REF/${crypto.randomUUID()}`,orderId,amount:order.totalAmount,cost:order.totalCost,reason,actorId:actor.id!}});
    const journal=await prisma.journalEntry.create({data:{entryNumber:await getNextSequence('JE'),sourceDocument:refund.refundNumber,documentRef:refund.refundNumber,journalType:'SALES',notes:reason,items:{create:[{accountCode:'4010',label:refund.refundNumber,debit:order.subtotalNet,credit:0},{accountCode:'2020',label:refund.refundNumber,debit:order.pbjtTax,credit:0},{accountCode:'1030',label:refund.refundNumber,debit:order.totalCost,credit:0},{accountCode:'1010',label:refund.refundNumber,debit:0,credit:order.totalAmount},{accountCode:'5010',label:refund.refundNumber,debit:0,credit:order.totalCost}]}},include:{items:true}});
    for(const line of order.lines){await prisma.stockLevel.update({where:{productSku_locationCode:{productSku:line.productSku,locationCode:order.locationCode}},data:{onHand:{increment:line.quantity}}});await prisma.stockMove.create({data:{moveNumber:`SM/POS-REF/${crypto.randomUUID()}`,productSku:line.productSku,sourceLocation:'Customer/Return',destLocation:order.locationCode,quantity:line.quantity,unitCost:line.standardCost,totalValue:line.quantity*line.standardCost,documentType:'POS_REFUND',documentRef:refund.refundNumber,actorId:actor.id,reason,journalEntryId:journal.id}});}
    for(const [code,delta] of [['4010',-order.subtotalNet],['2020',-order.pbjtTax],['1030',order.totalCost],['1010',-order.totalAmount],['5010',-order.totalCost]] as [string,number][])await prisma.account.update({where:{code},data:{currentBalance:{increment:delta}}});
    const promotion=await prisma.posPromotion.findUnique({where:{orderId}});
    if(promotion?.loyaltyAccountId && promotion.pointsEarned) await prisma.loyaltyAccount.update({where:{id:promotion.loyaltyAccountId},data:{points:{decrement:promotion.pointsEarned}}});
    await prisma.posOrder.update({where:{id:orderId},data:{status:'REFUNDED'}});
    if(order.session.status==='OPEN')await prisma.posSession.update({where:{id:order.sessionId},data:{totalSales:{decrement:order.totalAmount}}});
    await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'REFUND_POS',documentType:'POS_ORDER',documentId:order.id,beforeData:{status:order.status},afterData:{status:'REFUNDED',refundId:refund.id,journalId:journal.id},notes:reason});
    return {refund,journal};
  });
}
