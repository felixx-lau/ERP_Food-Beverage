import { prisma } from './prisma';
import { atomic } from './atomic';
import { Actor,BusinessError,permit,editable,quantity,money,uniqueLines,textValue,numberValue } from './validation';
import { recordAuditLog } from './audit';
import { calculateOrderTotals,confirmSalesOrder,approveOrderDiscount } from './salesEngine';
import { confirmPurchaseOrder } from './purchaseEngine';
import { postCustomerInvoice } from './accountingEngine';
import { postVendorBill } from './purchaseEngine';
import { validateDeliveryOrder } from './deliveryEngine';
import { validateGoodsReceipt } from './purchaseEngine';
import { validateInternalTransfer } from './transferEngine';

const definitions:any={sales:{model:'salesOrder',roles:['OWNER','SALES'],include:{lines:true,deliveryOrders:true,invoices:true}},purchase:{model:'purchaseOrder',roles:['OWNER','PROCUREMENT'],include:{lines:true,receipts:true,bills:true}},invoices:{model:'customerInvoice',roles:['OWNER','FINANCE'],include:{lines:true,payments:true,returns:true}},bills:{model:'vendorBill',roles:['OWNER','FINANCE'],include:{lines:true,payments:true}},deliveries:{model:'deliveryOrder',roles:['OWNER','WAREHOUSE'],include:{lines:true}},receipts:{model:'goodsReceipt',roles:['OWNER','WAREHOUSE'],include:{lines:true}},transfers:{model:'internalTransfer',roles:['OWNER','WAREHOUSE'],include:{lines:true}}};
export function documentRoles(kind:string): string[] { const d=Object.hasOwn(definitions,kind)?definitions[kind]:null; if(!d)throw new BusinessError("Jenis dokumen tidak valid.",404);return d.roles; }
export async function documentAction(kind:string,id:string,input:any,actor:Actor) {
  const definition=Object.hasOwn(definitions,kind)?definitions[kind]:null;if(!definition)throw new BusinessError('Jenis dokumen tidak valid.',404);permit(actor,definition.roles);
  return atomic(async()=>{
    const model=(prisma as any)[definition.model],before=await model.findUnique({where:{id},include:definition.include});
    if(!before)throw new BusinessError('Dokumen tidak ditemukan.',404);
    if(before.version!==undefined){numberValue(input.version,'Versi',0,true);if(before.version!==input.version)throw new BusinessError('Dokumen berubah. Muat ulang terlebih dahulu.',409);}
    const actorWithId=actor as {id:string;name:string;role:any};
    if(input.action==='confirm')return kind==='sales'?confirmSalesOrder(id,actorWithId):kind==='purchase'?confirmPurchaseOrder(id,actorWithId):Promise.reject(new BusinessError('Dokumen tidak dapat dikonfirmasi.'));
    if(input.action==='approve'&&kind==='sales')return approveOrderDiscount(id,actorWithId);
    if(input.action==='post')return kind==='invoices'?postCustomerInvoice(id,actorWithId):kind==='bills'?postVendorBill(id,actorWithId):Promise.reject(new BusinessError('Dokumen tidak dapat diposting.'));
    if(input.action==='validate') {
      if(kind==='deliveries')return validateDeliveryOrder({deliveryOrderId:id,items:input.items,actor:actorWithId});
      if(kind==='receipts')return validateGoodsReceipt({receiptId:id,items:input.items,actor:actorWithId});
      if(kind==='transfers')return validateInternalTransfer(id,actor);
      throw new BusinessError('Dokumen tidak dapat divalidasi.');
    }
    if(input.action==='cancel') {
      if(kind==='sales'&&before.status==='CONFIRMED') {
        if(before.lines.some((l:any)=>l.deliveredQty>0)||before.invoices.some((i:any)=>i.status!=='CANCELLED'))throw new BusinessError('Order sudah dipenuhi/ditagih. Gunakan retur atau reversal.',409);
        for(const line of before.lines){const rows=await prisma.stockReservation.findMany({where:{salesOrderLineId:line.id}});for(const r of rows){await prisma.stockLevel.update({where:{productSku_locationCode:{productSku:line.productSku,locationCode:r.locationCode}},data:{reserved:{decrement:r.quantity}}});await prisma.stockReservation.update({where:{id:r.id},data:{quantity:0}});}}
        await prisma.deliveryOrder.updateMany({where:{salesOrderId:id,status:{in:['DRAFT','CONFIRMED']}},data:{status:'CANCELLED'}});
      } else if(kind==='purchase'&&before.status==='CONFIRMED') {
        if(before.lines.some((l:any)=>l.receivedQty>0)||before.bills.some((b:any)=>b.status!=='CANCELLED'))throw new BusinessError('PO sudah diterima/ditagih. Pembatalan langsung ditolak.',409);
        await prisma.goodsReceipt.updateMany({where:{purchaseOrderId:id,status:'DRAFT'},data:{status:'CANCELLED'}});
      } else editable(before.status);
      if(kind==='deliveries'||kind==='receipts')throw new BusinessError('Batalkan dari order asal untuk menjaga reservasi dan pemenuhan.',409);
      const record=await model.update({where:{id},data:{status:'CANCELLED',...(before.version!==undefined?{version:{increment:1}}:{})}});
      await audit(kind,before,record,actor,'CANCEL');return {record};
    }
    if(input.action!=='edit')throw new BusinessError('Tindakan tidak valid.');
    editable(before.status);
    const lines:any[]=uniqueLines(input.lines,(l:any)=>l.productSku);
    let data:any;
    if(kind==='sales') {
      const contactId=input.contactId||before.contactId,customer=await prisma.contact.findUnique({where:{id:contactId}});
      if(!customer||customer.archivedAt||customer.type!=='CUSTOMER')throw new BusinessError('Pelanggan tidak tersedia.');
      if(before.leadId){const lead=await prisma.crmLead.findUnique({where:{id:before.leadId}});if(lead?.contactId!==contactId)throw new BusinessError('Pelanggan harus sesuai lead.');}
      const totals=await calculateOrderTotals(lines);
      data={contactId,paymentTerms:customer.paymentTerms,subtotalNet:totals.subtotalNet,pbjtTax:totals.pbjtTax,totalGross:totals.totalGross,projectedCost:totals.projectedCost,discountPercent:totals.maxDiscountPercent,discountApproved:totals.maxDiscountPercent<=10,discountApprovedBy:null,lines:{deleteMany:{},create:totals.lines}};
    } else if(kind==='purchase') {
      const vendorId=input.vendorId||before.vendorId,vendor=await prisma.contact.findUnique({where:{id:vendorId}});
      if(!vendor||vendor.archivedAt||vendor.type!=='VENDOR')throw new BusinessError('Vendor tidak tersedia.');
      const prepared=[];for(const line of lines){quantity(line.orderedQty);money(line.unitPrice);const p=await prisma.productVariant.findUnique({where:{sku:line.productSku}});if(!p||p.archivedAt)throw new BusinessError('SKU tidak tersedia.');prepared.push({productSku:p.sku,orderedQty:line.orderedQty,unitPrice:line.unitPrice,subtotal:line.orderedQty*line.unitPrice});}
      const subtotal=prepared.reduce((s,l)=>s+l.subtotal,0);money(subtotal);
      const scheduledDate=new Date(input.scheduledDate||before.scheduledDate);if(!Number.isFinite(scheduledDate.getTime()))throw new BusinessError('Tanggal tidak valid.');
      data={vendorId,scheduledDate,subtotal,taxAmount:0,total:subtotal,lines:{deleteMany:{},create:prepared}};
    } else if(kind==='invoices') {
      const source=await prisma.salesOrder.findUnique({where:{id:before.salesOrderId},include:{lines:true,invoices:{where:{id:{not:id},status:{not:'CANCELLED'}},include:{lines:true}}}});
      if(!source||source.status!=='CONFIRMED')throw new BusinessError('SO tidak aktif.');
      const prepared=[];for(const line of lines){quantity(line.quantity);const original=source.lines.find(l=>l.productSku===line.productSku);const used=source.invoices.reduce((n,i)=>n+i.lines.filter(l=>l.productSku===line.productSku).reduce((s,l)=>s+l.quantity,0),0);if(!original||line.quantity>original.deliveredQty-used)throw new BusinessError('Kuantitas invoice melebihi delivered yang belum ditagih (SR-02).');const netPrice=Math.round(line.quantity*original.unitPrice*(1-original.discountPercent/100)),pbjtAmount=Math.round(netPrice*.1);prepared.push({productSku:line.productSku,quantity:line.quantity,unitPrice:original.unitPrice,discountPercent:original.discountPercent,netPrice,pbjtAmount,totalAmount:netPrice+pbjtAmount});}
      const subtotalNet=prepared.reduce((n,l)=>n+l.netPrice,0),pbjtTax=prepared.reduce((n,l)=>n+l.pbjtAmount,0);data={subtotalNet,pbjtTax,totalGross:subtotalNet+pbjtTax,outstandingAmount:subtotalNet+pbjtTax,lines:{deleteMany:{},create:prepared}};
    } else if(kind==='bills') {
      const po=await prisma.purchaseOrder.findUnique({where:{id:before.purchaseOrderId},include:{lines:true,receipts:{where:{status:'DONE'},include:{lines:true}},bills:{where:{id:{not:id},status:{in:['POSTED','PAID']}},include:{lines:true}}}});
      if(!po||po.status!=='CONFIRMED')throw new BusinessError('PO tidak aktif.');
      const prepared=[];for(const line of lines){quantity(line.quantity);const original=po.lines.find(l=>l.productSku===line.productSku);const accepted=po.receipts.reduce((n,r)=>n+r.lines.filter(l=>l.productSku===line.productSku).reduce((s,l)=>s+l.acceptedQty,0),0);const used=po.bills.reduce((n,b)=>n+b.lines.filter(l=>l.productSku===line.productSku).reduce((s,l)=>s+l.quantity,0),0);if(!original||line.quantity>accepted-used)throw new BusinessError('Bill melebihi accepted yang belum ditagih (SR-06).');if(line.unitPrice!==undefined&&line.unitPrice!==original.unitPrice)throw new BusinessError('Harga harus sesuai PO.');const netPrice=line.quantity*original.unitPrice;prepared.push({productSku:line.productSku,quantity:line.quantity,unitPrice:original.unitPrice,netPrice,taxAmount:0,totalAmount:netPrice});}
      const subtotalNet=prepared.reduce((n,l)=>n+l.netPrice,0);data={subtotalNet,taxAmount:0,totalGross:subtotalNet,outstandingAmount:subtotalNet,lines:{deleteMany:{},create:prepared}};
    } else if(kind==='transfers') {
      const sourceLocation=input.sourceLocation||before.sourceLocation,destLocation=input.destLocation||before.destLocation;
      if(sourceLocation===destLocation)throw new BusinessError('Lokasi harus berbeda.');
      for(const code of [sourceLocation,destLocation])if(!await prisma.warehouseLocation.findFirst({where:{code,archivedAt:null}}))throw new BusinessError('Lokasi tidak tersedia.');
      const prepared=[];for(const line of lines){quantity(line.quantity);const product=await prisma.productVariant.findFirst({where:{sku:line.productSku,archivedAt:null}});if(!product)throw new BusinessError('SKU tidak tersedia.');prepared.push({productSku:product.sku,quantity:line.quantity,unitCost:product.standardCost,totalValue:line.quantity*product.standardCost});}data={sourceLocation,destLocation,lines:{deleteMany:{},create:prepared}};
    } else throw new BusinessError('Gunakan formulir validasi kuantitas.');
    const record=await model.update({where:{id},data:{...data,...(before.version!==undefined?{version:{increment:1}}:{})},include:definition.include});
    await audit(kind,before,record,actor,'EDIT_DRAFT');return {record};
  });
}
async function audit(kind:string,before:any,after:any,actor:Actor,action:string) {await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action,documentType:kind.toUpperCase(),documentId:before.id,beforeData:before,afterData:after});}
