import { prisma } from './prisma';
import { atomic } from './atomic';
import { BusinessError, permit, quantity, textValue, type Actor, uniqueLines } from './validation';
import { requireOutlet } from './outlets';
import { createPosOrder } from './posEngine';
import { recordAuditLog } from './audit';
export async function kitchenAction(action:string,input:any,actor:Actor) {
 return atomic(async()=>{
  if(action==='table'){
   permit(actor,['HEAD_ADMIN']);if(!await prisma.warehouseLocation.findFirst({where:{code:input.locationCode,archivedAt:null}}))throw new BusinessError('Lokasi tidak aktif.');
   return prisma.orderingTable.create({data:{name:textValue(input.name,'Nama meja'),locationCode:input.locationCode,token:crypto.randomUUID()+crypto.randomUUID()}});
  }
  if(action==='disableTable'){
   permit(actor,['HEAD_ADMIN']);return prisma.orderingTable.update({where:{id:input.id},data:{active:false}});
  }
  permit(actor,['HEAD_ADMIN','KITCHEN','CASHIER']);const ticket=await prisma.kitchenTicket.findUniqueOrThrow({where:{id:input.id}});
  if(actor.role==='CASHIER')await requireOutlet(actor,ticket.locationCode);
  if(action==='payTicket'){
   permit(actor,['HEAD_ADMIN','CASHIER']);if(ticket.posOrderId)return ticket;if(ticket.status==='CANCELLED')throw new BusinessError('Pesanan dibatalkan.');
   const session=await prisma.posSession.findUniqueOrThrow({where:{id:input.sessionId}});
   if(session.locationCode!==ticket.locationCode)throw new BusinessError('Sesi kasir harus pada outlet pesanan.');
   const result=await createPosOrder({sessionId:session.id,locationCode:ticket.locationCode,tableInfo:ticket.tableName,paymentMethod:input.paymentMethod,lines:JSON.parse(ticket.lines),actor});
   // Remove the auto-ticket created by POS; retain the original QR ticket and its lifecycle.
   await prisma.kitchenTicket.delete({where:{posOrderId:result.order.id}});
   return prisma.kitchenTicket.update({where:{id:ticket.id},data:{posOrderId:result.order.id,status:ticket.status==='PENDING'?'ACCEPTED':ticket.status}});
  }
  if(action!=='ticketStatus')throw new BusinessError('Tindakan tidak dikenali.');
  const allowed:Record<string,string[]>={PENDING:['ACCEPTED','CANCELLED'],ACCEPTED:['PREPARING','CANCELLED'],PREPARING:['READY'],READY:['COMPLETED']};
  if(!allowed[ticket.status]?.includes(input.status))throw new BusinessError('Urutan status dapur tidak valid.',409);
  if(input.status==='CANCELLED'&&ticket.posOrderId)throw new BusinessError('Pesanan sudah dibayar. Refund melalui POS sebelum pembatalan.');
  if(input.status==='COMPLETED'&&!ticket.posOrderId)throw new BusinessError('Catat pembayaran sebelum menyelesaikan pesanan.');
  const result=await prisma.kitchenTicket.update({where:{id:ticket.id},data:{status:input.status}});
  await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'KITCHEN_STATUS',documentType:'KITCHEN_TICKET',documentId:ticket.id,beforeData:{status:ticket.status},afterData:{status:result.status}});return result;
 });
}
export function validatePublicLines(lines:any) {
 uniqueLines(lines,(l:any)=>l.productSku);if(lines.length>30)throw new BusinessError('Maksimal 30 varian per pesanan.');
 return lines.map((l:any)=>{const amount=quantity(l.quantity);if(amount>100)throw new BusinessError('Maksimal 100 unit per varian per pesanan.');return {productSku:textValue(l.productSku,'SKU'),quantity:amount};});
}
