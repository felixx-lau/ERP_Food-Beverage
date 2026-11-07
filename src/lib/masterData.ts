import { prisma } from './prisma';
import { atomic } from './atomic';
import { recordAuditLog } from './audit';
import { calculateCustomerCreditStatus } from './creditControl';
import { Actor, BusinessError, permit, textValue, money, quantity, numberValue } from './validation';

const configs = {
  customers: { model: 'contact', key: 'id', roles: ['OWNER','SALES'], fixed: { type: 'CUSTOMER' } },
  vendors: { model: 'contact', key: 'id', roles: ['OWNER','PROCUREMENT'], fixed: { type: 'VENDOR' } },
  products: { model: 'productVariant', key: 'sku', roles: ['OWNER','WAREHOUSE'], fixed: {} },
  categories: { model: 'category', key: 'code', roles: ['OWNER','WAREHOUSE'], fixed: {} },
  units: { model: 'unitOfMeasure', key: 'code', roles: ['OWNER','WAREHOUSE'], fixed: {} },
  locations: { model: 'warehouseLocation', key: 'code', roles: ['OWNER','WAREHOUSE'], fixed: {} },
  accounts: { model: 'account', key: 'code', roles: ['OWNER','FINANCE'], fixed: {} },
  'vendor-prices': { model: 'vendorPrice', key: 'id', roles: ['OWNER','PROCUREMENT'], fixed: {} },
  leads: { model: 'crmLead', key: 'id', roles: ['OWNER','SALES'], fixed: {} },
} as const;
export type Resource = keyof typeof configs;
export function masterConfig(resource: string) {
  if (!Object.hasOwn(configs, resource)) throw new BusinessError('Modul master tidak ditemukan.', 404);
  return configs[resource as Resource];
}
const coreAccounts = ['1010','1020','1030','1040','2010','2020','2030','3010','4010','4020','5010','5020','6010','7010','8010'];
function protectedMaster(resource: string, record: any) { return (resource === 'accounts' && coreAccounts.includes(record.code)) || (resource === 'locations' && ['WH-JKT','CAFE-JKT'].includes(record.code)); }
export function canReadMaster(actor: Actor, resource: string) {
  masterConfig(resource);
  const read = resource === 'accounts' ? ['OWNER','FINANCE'] : resource === 'leads' ? ['OWNER','SALES'] : ['OWNER','SALES','WAREHOUSE','PROCUREMENT','FINANCE'];
  permit(actor, read);
}

async function referenced(resource: string, record: any): Promise<boolean> {
  const count = async (model: string, where: any) => (prisma as any)[model].count({ where });
  if (['customers','vendors'].includes(resource)) {
    if (record.openReceivable || record.openPayable) return true;
    const dependencies: [string, any][] = [['salesOrder',{contactId:record.id}],['purchaseOrder',{vendorId:record.id}],['crmLead',{contactId:record.id}],['customerInvoice',{customerId:record.id}],['vendorBill',{vendorId:record.id}],['payment',{OR:[{customerId:record.id},{vendorId:record.id}]}],['returnRequest',{customerId:record.id}],['creditNote',{customerId:record.id}],['productVariant',{defaultVendorId:record.id}],['vendorPrice',{vendorId:record.id}]];
    return (await Promise.all(dependencies.map(([m,w]) => count(m,w)))).some(Boolean);
  }
  if (resource === 'products') {
    const models = ['stockMove','salesOrderLine','purchaseOrderLine','deliveryOrderLine','goodsReceiptLine','customerInvoiceLine','vendorBillLine','posOrderLine','returnRequestLine','creditNoteLine','internalTransferLine','vendorPrice'];
    if ((await Promise.all(models.map(m => count(m,{productSku:record.sku})))) .some(Boolean)) return true;
    return !!await count('stockLevel',{productSku:record.sku,OR:[{onHand:{not:0}},{reserved:{not:0}}]});
  }
  if (resource === 'categories') return !!await count('productVariant',{categoryCode:record.code});
  if (resource === 'units') return !!await count('productVariant',{unit:record.code});
  if (resource === 'accounts') return protectedMaster(resource,record) || !!record.currentBalance || !!record.openingBalance || !!await count('journalItem',{accountCode:record.code});
  if (resource === 'leads') return !!await count('salesOrder',{leadId:record.id});
  if (resource === 'locations') {
    if (protectedMaster(resource,record)) return true;
    if (await count('stockLevel',{locationCode:record.code,OR:[{onHand:{not:0}},{reserved:{not:0}}]})) return true;
    return (await Promise.all([count('stockMove',{OR:[{sourceLocation:record.code},{destLocation:record.code}]}),count('deliveryOrder',{sourceLocation:record.code}),count('goodsReceipt',{destLocation:record.code}),count('internalTransfer',{OR:[{sourceLocation:record.code},{destLocation:record.code}]}),count('posSession',{locationCode:record.code})])).some(Boolean);
  }
  return false;
}
async function decorate(resource: string, record: any, actor: Actor) {
  const allowed = (masterConfig(resource).roles as readonly string[]).includes(actor.role);
  return { ...record, capabilities: { edit: allowed, archive: allowed && !protectedMaster(resource,record) && !record.archivedAt, restore: allowed && !!record.archivedAt, delete: allowed && !await referenced(resource,record) && !protectedMaster(resource,record) } };
}
async function active(model: string, key: string, value: string, label: string) {
  const record = await (prisma as any)[model].findUnique({ where: { [key]: value } });
  if (!record || record.archivedAt) throw new BusinessError(`${label} tidak tersedia.`);
  return record;
}
async function validated(resource: string, input: any, actor: Actor, before?: any) {
  const c=masterConfig(resource), value={...before,...input}, data:any={};
  if (input.openReceivable !== undefined || input.openPayable !== undefined || input.openingBalance !== undefined || input.currentBalance !== undefined) throw new BusinessError('Saldo keuangan tidak dapat diubah melalui master data.');
  if (resource !== 'vendor-prices') data.name=textValue(value.name,'Nama');
  if (['customers','vendors'].includes(resource)) {
    data.city=textValue(value.city ?? 'Jakarta','Kota');
    for (const field of ['email','phone','address']) data[field]=textValue(value[field] ?? '',field,false,field==='address'?1000:250);
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new BusinessError('Email tidak valid.');
    if (!['IMMEDIATE','NET7','NET14','NET30'].includes(value.paymentTerms ?? 'IMMEDIATE')) throw new BusinessError('Termin pembayaran tidak valid.');
    data.paymentTerms=value.paymentTerms ?? 'IMMEDIATE';
    if (resource==='customers') {
      data.customerType=value.customerType ?? 'COMPANY';
      if (!['COMPANY','INDIVIDUAL'].includes(data.customerType)) throw new BusinessError('Tipe pelanggan tidak valid.');
      data.creditLimit=money(value.creditLimit ?? 0);
      if (data.creditLimit !== (before?.creditLimit ?? 0) && actor.role!=='OWNER') throw new BusinessError('Perubahan limit kredit hanya oleh Owner.',403);
    }
  } else if (resource==='products') {
    for (const field of ['size','color','unit']) data[field]=textValue(value[field] ?? ({size:'Regular',color:'Original',unit:'porsi'} as any)[field],field);
    await active('unitOfMeasure','code',data.unit,'Satuan');
    data.salesPrice=money(value.salesPrice); data.standardCost=money(value.standardCost);
    if (before && before.unit!==data.unit && await referenced("products",before)) throw new BusinessError("Satuan SKU yang memiliki stok/riwayat tidak boleh diubah.",409);
    data.description=textValue(value.description ?? '','Deskripsi',false,4000);
    data.categoryCode=value.categoryCode || null; data.defaultVendorId=value.defaultVendorId || null;
    if (data.categoryCode) await active('category','code',data.categoryCode,'Kategori');
    if (data.defaultVendorId && (await active('contact','id',data.defaultVendorId,'Vendor')).type!=='VENDOR') throw new BusinessError('Default vendor harus bertipe Vendor.');
    if (before && before.standardCost!==data.standardCost && await referenced('products',before)) throw new BusinessError('Biaya standar SKU dengan stok/riwayat terkunci untuk menjaga valuasi. Gunakan SKU baru untuk perubahan biaya.',409);
  } else if (resource==='locations') { data.type='Internal'; data.usage=textValue(value.usage ?? 'Internal','Penggunaan'); }
  else if (resource==='accounts') {
    data.type=value.type;
    if (!['ASSET','LIABILITY','EQUITY','INCOME','CONTRA_INCOME','EXPENSE'].includes(data.type)) throw new BusinessError('Tipe akun tidak valid.');
    if (before && before.type!==data.type && await referenced(resource,before)) throw new BusinessError('Tipe akun yang digunakan tidak boleh diubah.',409);
  } else if (resource==='vendor-prices') {
    data.vendorId=textValue(value.vendorId,'Vendor'); data.productSku=textValue(value.productSku,'SKU');
    if ((await active('contact','id',data.vendorId,'Vendor')).type!=='VENDOR') throw new BusinessError('Kontak harus Vendor.');
    await active('productVariant','sku',data.productSku,'SKU');
    data.price=money(value.price); data.minimumQty=quantity(value.minimumQty ?? 1); data.currency='IDR';
  } else if (resource==='leads') {
    data.contactId=textValue(value.contactId,'Pelanggan');
    if ((await active('contact','id',data.contactId,'Pelanggan')).type!=='CUSTOMER') throw new BusinessError('Kontak harus Pelanggan.');
    data.expectedRevenue=money(value.expectedRevenue ?? 0); data.stage=value.stage ?? 'NEW';
    if (!['NEW','QUALIFIED','PROPOSITION','WON'].includes(data.stage) || (['PROPOSITION','WON'].includes(data.stage) && !data.expectedRevenue)) throw new BusinessError('Pelanggan dan nilai peluang wajib sebelum Proposition/Won (SR-16).');
  }
  if (!before) {
    data[c.key]=c.key==='id' ? `${resource==='customers'?'C':resource==='vendors'?'V':resource==='leads'?'LD':''}${crypto.randomUUID()}` : textValue(input[c.key],c.key,true,60);
    if (c.key!=='id' && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(data[c.key])) throw new BusinessError('Kode hanya boleh huruf, angka, titik, garis bawah, atau tanda minus.');
  } else if (input[c.key]!==undefined && input[c.key]!==before[c.key]) throw new BusinessError('Identitas record tidak dapat diubah.');
  return {...data,...c.fixed};
}

export async function listMaster(resource: string, actor: Actor, query: URLSearchParams) {
  canReadMaster(actor,resource); const c=masterConfig(resource), model=(prisma as any)[c.model];
  const page=Math.max(1,Number(query.get('page'))||1), limit=Math.max(1,Math.min(100,Number(query.get('limit'))||25));
  const status=query.get('status')||'active', where:any={...c.fixed};
  if (status!=='all') where.archivedAt=status==='archived'?{not:null}:null;
  const search=(query.get('q')||'').trim();
  if (search) where.OR=[{[c.key]:{contains:search}},...(resource==='vendor-prices'?[{productSku:{contains:search}},{vendorId:{contains:search}}]:[{name:{contains:search}}])];
  const sort=query.get('sort')=== 'name' && resource!=='vendor-prices'?'name':c.key;
  const orderBy={ [sort]: query.get('direction')==='desc'?'desc':'asc' };
  const [records,total]=await Promise.all([model.findMany({where,orderBy,skip:(page-1)*limit,take:limit}),model.count({where})]);
  return { records: await Promise.all(records.map((r:any)=>decorate(resource,r,actor))), total, page, limit, pages:Math.max(1,Math.ceil(total/limit)), canCreate:(c.roles as readonly string[]).includes(actor.role) };
}
export async function getMaster(resource: string, id: string, actor: Actor) {
  canReadMaster(actor,resource); const c=masterConfig(resource);
  const record=await (prisma as any)[c.model].findFirst({where:{[c.key]:id,...c.fixed}});
  if (!record) throw new BusinessError('Record tidak ditemukan.',404);
  const history=await prisma.auditLog.findMany({where:{documentType:`MASTER_${resource}`,documentId:id},orderBy:{timestamp:'desc'},take:50});
  let related:any={};
  if (['customers','vendors'].includes(resource)) {
    related=resource==='customers'?{salesOrders:await prisma.salesOrder.findMany({where:{contactId:id}}),invoices:await prisma.customerInvoice.findMany({where:{customerId:id}}),credit:await calculateCustomerCreditStatus(id)}:{purchaseOrders:await prisma.purchaseOrder.findMany({where:{vendorId:id}}),bills:await prisma.vendorBill.findMany({where:{vendorId:id}}),prices:await prisma.vendorPrice.findMany({where:{vendorId:id,archivedAt:null}})};
    if (!['OWNER','FINANCE','SALES'].includes(actor.role) && resource==='customers') related={};
  } else if (resource==='products') related={stock:await prisma.stockLevel.findMany({where:{productSku:id}}),movements:await prisma.stockMove.findMany({where:{productSku:id},orderBy:{date:'desc'},take:100})};
  else if (resource==='leads') related={salesOrders:await prisma.salesOrder.findMany({where:{leadId:id}})};
  return {record:await decorate(resource,record,actor),history,related};
}
export async function createMaster(resource: string, input: any, actor: Actor) {
  const c=masterConfig(resource); permit(actor,[...c.roles]);
  return atomic(async()=>{
    const data=await validated(resource,input,actor);
    const record=await (prisma as any)[c.model].create({data});
    await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'CREATE',documentType:`MASTER_${resource}`,documentId:record[c.key],afterData:record});
    return decorate(resource,record,actor);
  });
}
export async function changeMaster(resource: string, id: string, input: any, actor: Actor, remove=false) {
  const c=masterConfig(resource); permit(actor,[...c.roles]);
  return atomic(async()=>{
    const model=(prisma as any)[c.model], before=await model.findFirst({where:{[c.key]:id,...c.fixed}});
    if (!before) throw new BusinessError('Record tidak ditemukan.',404);
    numberValue(input.version,'Versi',0,true);
    if (input.version!==before.version) throw new BusinessError('Data telah diubah pengguna lain. Muat ulang sebelum menyimpan.',409);
    if (remove) {
      if (await referenced(resource,before) || protectedMaster(resource,before)) throw new BusinessError('Record mempunyai stok, saldo, atau dokumen terkait. Gunakan Arsip.',409);
      if (resource==='products') await prisma.stockLevel.deleteMany({where:{productSku:id}});
      if (resource==='locations') await prisma.stockLevel.deleteMany({where:{locationCode:id}});
      await model.delete({where:{[c.key]:id}});
      await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'DELETE_UNUSED',documentType:`MASTER_${resource}`,documentId:id,beforeData:before});
      return {deleted:true};
    }
    let data:any;
    if (input.action==='archive' || input.action==='restore') {
      if (protectedMaster(resource,before)) throw new BusinessError('Record sistem tidak dapat diarsipkan.',409);
      if (input.action==='archive' && resource==='locations' && await prisma.stockLevel.count({where:{locationCode:id,OR:[{onHand:{not:0}},{reserved:{not:0}}]}})) throw new BusinessError('Pindahkan stok sebelum mengarsipkan lokasi.',409);
      data={archivedAt:input.action==='archive'?new Date():null};
    } else {
      if (before.archivedAt) throw new BusinessError('Pulihkan record sebelum mengubahnya.',409);
      data=await validated(resource,input,actor,before);
    }
    const record=await model.update({where:{[c.key]:id},data:{...data,version:{increment:1}}});
    await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:input.action?.toUpperCase()||'UPDATE',documentType:`MASTER_${resource}`,documentId:id,beforeData:before,afterData:record});
    return decorate(resource,record,actor);
  });
}
