import { businessDayStart } from './businessDate';
/** Runs under the same writer transaction as inventory changes. One open PR per SKU/location. */
export async function evaluateReorderRules(db: any) {
  const rules = await db.reorderRule.findMany({ where: { active: true } });
  for (const r of rules) {
    const stock = await db.stockLevel.findUnique({ where: { productSku_locationCode: { productSku: r.productSku, locationCode: r.locationCode } } });
    const product=await db.productVariant.findFirst({where:{sku:r.productSku,archivedAt:null}});if(!product)continue;
    const loc=await db.warehouseLocation.findFirst({where:{code:r.locationCode,archivedAt:null}});if(!loc)continue;
    const validLots=product.trackLots?await db.stockLot.aggregate({where:{productSku:r.productSku,locationCode:r.locationCode,expiresAt:{gte:businessDayStart()}},_sum:{onHand:true}}):null;
    const physical=stock?.onHand||0;
    const available = Math.min(physical,validLots?validLots._sum.onHand||0:physical) - (stock?.reserved || 0);
    if (available >= r.minimum || await db.purchaseRequest.findFirst({ where: { productSku: r.productSku, locationCode: r.locationCode, status: { in: ['PENDING','APPROVED'] } } })) continue;
    const converted=await db.purchaseRequest.findMany({where:{productSku:r.productSku,locationCode:r.locationCode,status:'CONVERTED'}});
    let committed=false;
    for(const pr of converted){const po=pr.purchaseOrderId?await db.purchaseOrder.findUnique({where:{id:pr.purchaseOrderId},include:{lines:true}}):null;if(po&&(po.status==='DRAFT'||po.status==='CONFIRMED'&&po.lines.some((l:any)=>l.productSku===r.productSku&&l.receivedQty<l.orderedQty))){committed=true;break;}}
    if(committed)continue;
    const incoming = await db.goodsReceiptLine.findMany({ where: { productSku: r.productSku, receipt: { destLocation: r.locationCode, status: { in: ['DRAFT','CONFIRMED'] } } }, select: { demandQty: true } });
    const amount = Math.max(0, r.target - available - incoming.reduce((n: number, l: any) => n + l.demandQty, 0));
    if (amount) { const created=await db.purchaseRequest.create({ data: { number: `PR/${crypto.randomUUID()}`, productSku: r.productSku, locationCode: r.locationCode, quantity: amount, reason: `Otomatis: tersedia ${available}, minimum ${r.minimum}, target ${r.target}; memperhitungkan penerimaan terbuka di lokasi ini.`, requestedBy: 'SYSTEM_REORDER' } });
      await db.auditLog.create({data:{actorName:'Aturan stok otomatis',actorRole:'HEAD_ADMIN',action:'GENERATE_PURCHASE_REQUEST',documentType:'PURCHASE_REQUEST',documentId:created.id,notes:created.reason}});
    }
  }
}
