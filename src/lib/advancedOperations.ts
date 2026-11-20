import type { SessionUser } from './auth';
import { prisma } from './prisma';
import { atomic } from './atomic';
import { permit, quantity, textValue, BusinessError, type Actor } from './validation';
import { recordAuditLog } from './audit';
import { getNextSequence } from './sequences';
import { consumeLots } from './lotEngine';
import { businessDayEnd } from './businessDate';
import { createPurchaseQuotation } from './purchaseEngine';

type Ingredient = { productSku: string; quantity: number };
const operators = ['HEAD_ADMIN','WAREHOUSE','KITCHEN'];
async function product(sku: string) { const p = await prisma.productVariant.findFirst({ where: { sku: textValue(sku, 'SKU'), archivedAt: null } }); if (!p) throw new BusinessError('SKU aktif tidak ditemukan.'); return p; }
async function location(code: string) {
  const record = await prisma.warehouseLocation.findFirst({ where: { code: textValue(code, 'Lokasi'), archivedAt: null } });
  if (!record) throw new BusinessError('Lokasi aktif tidak ditemukan.');
  return record;
}
async function audit(actor: Actor, action: string, id: string, data: unknown) { await recordAuditLog({ actorId:actor.id, actorName:actor.name, actorRole:actor.role as any, action, documentType:'ADVANCED_FNB', documentId:id, afterData:data }); }
async function journal(reference: string, debits: [string, number][], credits: [string, number][]) {
 const entries = [...debits.map(([accountCode,debit]) => ({accountCode,debit,credit:0,label:reference})), ...credits.map(([accountCode,credit]) => ({accountCode,credit,debit:0,label:reference}))].filter(x => x.debit || x.credit);
 if (Math.abs(entries.reduce((n,l) => n+l.debit-l.credit,0)) > .001) throw new BusinessError('Jurnal produksi tidak seimbang.');
 const j = await prisma.journalEntry.create({data:{entryNumber:await getNextSequence('JE'),sourceDocument:reference,documentRef:reference,journalType:'INVENTORY',items:{create:entries}}});
 for (const l of entries) { const a = await prisma.account.findUniqueOrThrow({where:{code:l.accountCode}}); await prisma.account.update({where:{code:a.code},data:{currentBalance:{increment:['ASSET','EXPENSE','CONTRA_INCOME'].includes(a.type)?l.debit-l.credit:l.credit-l.debit}}}); }
 return j;
}
async function move(sku: string, loc: string, qty: number, ref: string, actor: Actor, unitCost: number, destination: string, journalId?: string) {
 await prisma.stockMove.create({ data:{moveNumber:`SM/${crypto.randomUUID()}`,productSku:sku,sourceLocation:loc,destLocation:destination,quantity:qty,unitCost,totalValue:qty*unitCost,documentType:'PRODUCTION_WASTE',documentRef:ref,actorId:actor.id,journalEntryId:journalId} });
}
export async function advancedMutation(action: string, input: any, actor: SessionUser) {
 return atomic(async () => {
  if (action === 'recipe') {
   permit(actor,operators);
   const output = await product(input.productSku);
   const name = textValue(input.name, 'Nama resep');
   const outputQty = quantity(input.outputQty);
   const mode = input.mode;
   if (!['PRODUCTION','BACKFLUSH'].includes(mode)) throw new BusinessError('Pilih mode produksi atau konsumsi bahan saat POS.');
   if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 50) throw new BusinessError('Isi 1–50 bahan.');
   const recipes = await prisma.recipe.findMany({ where: { active: true } });
   const bySku = new Map(recipes.map(recipe => [recipe.productSku, recipe]));
   const lines: Ingredient[] = [];
   const seen = new Set<string>();
   for (const line of input.lines) {
     const ingredient = await product(line?.productSku);
     if (seen.has(ingredient.sku)) throw new BusinessError('SKU bahan duplikat.');
     seen.add(ingredient.sku);
     if (bySku.get(ingredient.sku)?.mode === 'BACKFLUSH') throw new BusinessError('Bahan harus memiliki stok fisik.');
     const amount = quantity(line.quantity);
     if (mode === 'BACKFLUSH' && amount % outputQty !== 0) throw new BusinessError('Takaran per menu harus bulat dalam satuan dasar bahan untuk pemakaian saat POS.');
     lines.push({ productSku: ingredient.sku, quantity: amount });
   }

   const visited = new Set<string>();
   function dependsOnOutput(sku: string): boolean {
     if (sku === output.sku) return true;
     if (visited.has(sku)) return false;
     visited.add(sku);
     const recipe = bySku.get(sku);
     return !!recipe && (JSON.parse(recipe.lines) as Ingredient[]).some(line => dependsOnOutput(line.productSku));
   }
   if (lines.some(line => dependsOnOutput(line.productSku))) throw new BusinessError('Komposisi resep membentuk siklus.');
   if (mode === 'BACKFLUSH') {
     if (output.kind !== 'MENU') throw new BusinessError('Konsumsi saat POS hanya berlaku untuk menu.');
     if (recipes.some(recipe => recipe.productSku !== output.sku && (JSON.parse(recipe.lines) as Ingredient[]).some(line => line.productSku === output.sku))) {
       throw new BusinessError('SKU ini masih dipakai sebagai bahan resep lain.');
     }
     if (await prisma.reorderRule.count({ where: { productSku: output.sku, active: true } })) {
       throw new BusinessError('Jeda aturan stok menu ini, lalu atur minimum stok untuk bahan pada resepnya.');
     }
   }
   const old = await prisma.recipe.findUnique({ where: { productSku: output.sku } });
   if (old && old.version !== input.version) throw new BusinessError('Resep sudah berubah. Muat ulang.',409);
   const data = { name, outputQty, mode, lines: JSON.stringify(lines), active: true };
   const recipe = await prisma.recipe.upsert({
     where: { productSku: output.sku },
     create: { productSku: output.sku, ...data },
     update: { ...data, version: { increment: 1 } },
   });
   await audit(actor,'SAVE_RECIPE',recipe.id,recipe);
   return recipe;
  }
  if (action === 'deactivateRecipe') {
   permit(actor, operators);
   const recipe = await prisma.recipe.findUniqueOrThrow({ where: { id: textValue(input.id, 'Resep') } });
   if (recipe.version !== input.version) throw new BusinessError('Resep sudah berubah. Muat ulang.', 409);
   if (await prisma.productionOrder.count({ where: { recipeId: recipe.id, status: 'DRAFT' } })) {
     throw new BusinessError('Selesaikan atau batalkan rencana produksi yang masih terbuka.');
   }
   const record = await prisma.recipe.update({ where: { id: recipe.id }, data: { active: false, version: { increment: 1 } } });
   await audit(actor, 'DEACTIVATE_RECIPE', record.id, record);
   return record;
  }
  if(action==='production'){
   permit(actor,operators); const recipe=await prisma.recipe.findUniqueOrThrow({where:{id:input.recipeId}});if(!recipe.active||recipe.mode!=='PRODUCTION')throw new BusinessError('Pilih resep produksi aktif.');await location(input.locationCode);const plannedQty=quantity(input.plannedQty);
   const r=await prisma.productionOrder.create({data:{number:`MO/${crypto.randomUUID()}`,recipeId:recipe.id,recipeVersion:recipe.version,productSku:recipe.productSku,locationCode:input.locationCode,plannedQty,recipeSnapshot:JSON.stringify(recipe)}});await audit(actor,'CREATE_PRODUCTION',r.id,r);return r;
  }
  if(action==='cancelProduction'){
   permit(actor,operators);const mo=await prisma.productionOrder.findUniqueOrThrow({where:{id:input.id}});if(mo.status!=='DRAFT')throw new BusinessError('Hanya rencana produksi draft yang dapat dibatalkan.');const r=await prisma.productionOrder.update({where:{id:mo.id},data:{status:'CANCELLED'}});await audit(actor,'CANCEL_PRODUCTION',r.id,r);return r;
  }
  if(action==='finishProduction'){
   permit(actor,operators);const mo=await prisma.productionOrder.findUniqueOrThrow({where:{id:input.id}});if(mo.status==='DONE')return mo;if(mo.status!=='DRAFT')throw new BusinessError('Produksi sudah tidak dapat diproses.');
   const recipe=JSON.parse(mo.recipeSnapshot), expected:Ingredient[]=JSON.parse(recipe.lines);const actualQty=quantity(input.actualQty);if(actualQty>mo.plannedQty)throw new BusinessError('Hasil tidak boleh melebihi rencana.');
   if(!Array.isArray(input.inputs)||input.inputs.length!==expected.length)throw new BusinessError('Isi pemakaian aktual seluruh bahan.');
   const used:Ingredient[]=expected.map(l=>{const matches=input.inputs.filter((x:any)=>x.productSku===l.productSku);if(matches.length!==1)throw new BusinessError('Bahan aktual tidak sesuai snapshot resep.');return {productSku:l.productSku,quantity:quantity(matches[0].quantity,true)};});
   let totalCost=0, expectedCost=0;
   for(const l of used){const p=await product(l.productSku),e=expected.find(x=>x.productSku===l.productSku)!;expectedCost+=e.quantity*actualQty/recipe.outputQty*p.standardCost;const stock=await prisma.stockLevel.findUnique({where:{productSku_locationCode:{productSku:l.productSku,locationCode:mo.locationCode}}});if(l.quantity>(stock?.onHand||0)-(stock?.reserved||0))throw new BusinessError(`Stok tersedia ${l.productSku} tidak cukup.`);if(l.quantity){await consumeLots(prisma,l.productSku,mo.locationCode,l.quantity,mo.number);await prisma.stockLevel.update({where:{id:stock!.id},data:{onHand:{decrement:l.quantity}}});totalCost+=l.quantity*p.standardCost;}}
   if(!totalCost)throw new BusinessError('Pemakaian aktual tidak boleh seluruhnya nol.');
   const output=await product(mo.productSku),value=actualQty*output.standardCost,difference=totalCost-value;
   const j=await journal(mo.number,[['1030',value],['8010',Math.max(0,difference)]],[['1030',totalCost],['8010',Math.max(0,-difference)]]);
   await prisma.stockLevel.upsert({where:{productSku_locationCode:{productSku:mo.productSku,locationCode:mo.locationCode}},create:{productSku:mo.productSku,locationCode:mo.locationCode,onHand:actualQty},update:{onHand:{increment:actualQty}}});
   for(const l of used)if(l.quantity)await move(l.productSku,mo.locationCode,l.quantity,mo.number,actor,(await product(l.productSku)).standardCost,'Production/Input',j.id);
   await move(mo.productSku,'Production/Output',actualQty,mo.number,actor,output.standardCost,mo.locationCode,j.id);
   let lotCode:string|null=null,expiresAt:Date|null=null;
   if(output.trackLots){lotCode=textValue(input.lotCode,'Kode batch hasil');expiresAt=businessDayEnd(textValue(input.expiresAt,'Kedaluwarsa hasil'));if(expiresAt<new Date())throw new BusinessError('Batch hasil sudah kedaluwarsa.');await prisma.stockLot.create({data:{productSku:mo.productSku,locationCode:mo.locationCode,code:lotCode,onHand:actualQty,expiresAt,sourceRef:mo.number}});}
   const r=await prisma.productionOrder.update({where:{id:mo.id},data:{status:'DONE',actualQty,actualInputs:JSON.stringify(used),totalCost,varianceValue:totalCost-expectedCost,journalId:j.id,lotCode,expiresAt}});await audit(actor,'FINISH_PRODUCTION',r.id,r);return r;
  }
  if(action==='lot'){
   permit(actor,['HEAD_ADMIN','WAREHOUSE']);const p=await product(input.productSku);await location(input.locationCode);const qty=quantity(input.quantity),code=textValue(input.code,'Kode batch'),sourceRef=textValue(input.sourceRef,'Sumber/QC batch');const expiresAt=businessDayEnd(textValue(input.expiresAt,'Tanggal kedaluwarsa'));
   const stock=await prisma.stockLevel.findUnique({where:{productSku_locationCode:{productSku:p.sku,locationCode:input.locationCode}}});const allocated=await prisma.stockLot.aggregate({where:{productSku:p.sku,locationCode:input.locationCode},_sum:{onHand:true}});
   if(qty>(stock?.onHand||0)-(allocated._sum.onHand||0))throw new BusinessError('Jumlah batch melebihi stok fisik yang belum dialokasikan. Penerimaan barang tetap melalui modul Penerimaan.');
   const r=await prisma.stockLot.create({data:{productSku:p.sku,locationCode:input.locationCode,code,onHand:qty,expiresAt,sourceRef}});await prisma.productVariant.update({where:{sku:p.sku},data:{trackLots:true}});await audit(actor,'REGISTER_LOT',r.id,r);return r;
  }
  if(action==='waste'){
   permit(actor,operators);const p=await product(input.productSku);await location(input.locationCode);const qty=quantity(input.quantity),reason=textValue(input.reason,'Alasan waste',true,1000);const stock=await prisma.stockLevel.findUniqueOrThrow({where:{productSku_locationCode:{productSku:p.sku,locationCode:input.locationCode}}});if(qty>stock.onHand-stock.reserved)throw new BusinessError('Waste tidak boleh memakai stok yang sudah dipesan.');const ref=`WASTE/${crypto.randomUUID()}`;
   if(p.trackLots&&!input.lotId)throw new BusinessError('Pilih batch untuk waste.');await consumeLots(prisma,p.sku,input.locationCode,qty,ref,undefined,input.lotId);
   await prisma.stockLevel.update({where:{id:stock.id},data:{onHand:{decrement:qty}}});const value=qty*p.standardCost,j=await journal(ref,[['8010',value]],[['1030',value]]);await move(p.sku,input.locationCode,qty,ref,actor,p.standardCost,'Inventory/Waste',j.id);
   const r=await prisma.wasteRecord.create({data:{number:ref,productSku:p.sku,locationCode:input.locationCode,lotId:input.lotId||null,quantity:qty,cost:value,reason,journalId:j.id,actorId:actor.id!}});await audit(actor,'POST_WASTE',r.id,r);return r;
  }
  if(action==='rule'){
   permit(actor, ['HEAD_ADMIN','PROCUREMENT']);
   const item = await product(input.productSku);
   const { code: locationCode } = await location(input.locationCode);
   if (await prisma.recipe.count({ where: { productSku: item.sku, mode: 'BACKFLUSH', active: true } })) {
     throw new BusinessError('Atur minimum stok untuk bahan pada resep menu ini.');
   }
   const minimum = quantity(input.minimum, true);
   const target = quantity(input.target);
   if (target <= minimum) throw new BusinessError('Target harus lebih besar dari minimum.');
   const rule = await prisma.reorderRule.upsert({
     where: { productSku_locationCode: { productSku: item.sku, locationCode } },
     create: { productSku: item.sku, locationCode, minimum, target },
     update: { minimum, target, active: true },
   });
   await audit(actor, 'SAVE_REORDER_RULE', rule.id, rule);
   return rule;
  }
  if (action === 'toggleRule') {
   permit(actor, ['HEAD_ADMIN','PROCUREMENT']);
   if (typeof input.active !== 'boolean') throw new BusinessError('Status aturan tidak valid.');
   const rule = await prisma.reorderRule.findUniqueOrThrow({ where: { id: textValue(input.id, 'Aturan') } });
   if (input.active) {
     await product(rule.productSku);
     await location(rule.locationCode);
     if (await prisma.recipe.count({ where: { productSku: rule.productSku, mode: 'BACKFLUSH', active: true } })) {
       throw new BusinessError('Atur minimum stok untuk bahan pada resep menu ini.');
     }
   }
   const updated = await prisma.reorderRule.update({ where: { id: rule.id }, data: { active: input.active } });
   await audit(actor, 'TOGGLE_REORDER_RULE', updated.id, updated);
   return updated;
  }
  if (action === 'evaluateRules') {
   permit(actor, ['HEAD_ADMIN','PROCUREMENT','WAREHOUSE']);
   return { message: 'Aturan stok diperiksa.' }; // Evaluated once before the atomic transaction commits.
  }
  if (action === 'approveRequest' || action === 'rejectRequest') {
   permit(actor, ['HEAD_ADMIN','OWNER']);
   const request = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id: textValue(input.id, 'Pengajuan') } });
   if (request.status !== 'PENDING') throw new BusinessError('Permintaan sudah diproses.', 409);
   const status = action === 'approveRequest' ? 'APPROVED' : 'REJECTED';
   const updated = await prisma.purchaseRequest.update({ where: { id: request.id }, data: { status, approvedBy: actor.id } });
   if (status === 'REJECTED') await prisma.reorderRule.updateMany({ where: { productSku: request.productSku, locationCode: request.locationCode }, data: { active: false } });
   await audit(actor, action, request.id, updated);
   return updated;
  }
  if (action === 'requestToPO') {
   permit(actor, ['HEAD_ADMIN','PROCUREMENT']);
   const request = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id: textValue(input.id, 'Pengajuan') } });
   if (request.purchaseOrderId) return request;
   if (request.status !== 'APPROVED') throw new BusinessError('Permintaan harus disetujui Owner atau Head Admin.');
   const item = await product(request.productSku);
   await location(request.locationCode);
   const vendorId = textValue(input.vendorId ?? item.defaultVendorId, 'Vendor');
   const order = await createPurchaseQuotation({
     vendorId, lines: [{ productSku: request.productSku, orderedQty: request.quantity }], actor,
   });
   const result = await prisma.purchaseRequest.update({ where: { id: request.id }, data: { status: 'CONVERTED', purchaseOrderId: order.id } });
   await audit(actor, 'REQUEST_TO_PO', request.id, result);
   return result;
  }
  if(action==='outletAccess'){
   permit(actor,['HEAD_ADMIN']);await location(input.locationCode);const user=await prisma.user.findUniqueOrThrow({where:{id:input.userId}});if(user.role!=='CASHIER')throw new BusinessError('Pilih pengguna Kasir.');const r=await prisma.outletAccess.upsert({where:{userId_locationCode:{userId:user.id,locationCode:input.locationCode}},create:{userId:user.id,locationCode:input.locationCode},update:{}});await audit(actor,'GRANT_OUTLET',r.id,r);return r;
  }
  if(action==='revokeOutlet'){permit(actor,['HEAD_ADMIN']);const r=await prisma.outletAccess.findUniqueOrThrow({where:{id:input.id}});await prisma.outletAccess.delete({where:{id:r.id}});await audit(actor,'REVOKE_OUTLET',r.id,r);return {message:'Akses dicabut. Tanpa penugasan, kasir kembali ke CAFE-JKT.'};}
  throw new BusinessError('Tindakan tidak dikenali.');
 });
}
