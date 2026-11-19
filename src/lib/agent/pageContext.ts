import {contactView} from '@/lib/uxFlows';
import type { PrismaClient } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';
const pages:Record<string,{title:string;roles:string[];model?:string;number?:string}>={
  '/':{title:'Beranda dan prioritas pekerjaan',roles:['HEAD_ADMIN','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER']},
  '/sales/contacts':{title:'Pelanggan dan vendor',roles:['HEAD_ADMIN','SALES','PROCUREMENT','FINANCE']},
  '/sales/orders':{title:'Pesanan penjualan',roles:['HEAD_ADMIN','SALES','WAREHOUSE','FINANCE'],model:'salesOrder',number:'orderNumber'},
  '/purchase/orders':{title:'Pesanan pembelian',roles:['HEAD_ADMIN','PROCUREMENT','WAREHOUSE','FINANCE'],model:'purchaseOrder',number:'poNumber'},
  '/inventory/delivery':{title:'Pengiriman barang',roles:['HEAD_ADMIN','WAREHOUSE','FINANCE','SALES'],model:'deliveryOrder',number:'deliveryNumber'},
  '/inventory/receipts':{title:'Penerimaan barang',roles:['HEAD_ADMIN','WAREHOUSE','FINANCE','PROCUREMENT'],model:'goodsReceipt',number:'receiptNumber'},
  '/inventory/transfers':{title:'Transfer stok',roles:['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE','SALES'],model:'internalTransfer',number:'transferNumber'},
  '/inventory/products':{title:'Stok produk per lokasi',roles:['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE','SALES']},
  '/accounting/invoices':{title:'Invoice pelanggan',roles:['HEAD_ADMIN','FINANCE','SALES','WAREHOUSE'],model:'customerInvoice',number:'invoiceNumber'},
  '/accounting/vendor-bills':{title:'Tagihan vendor',roles:['HEAD_ADMIN','FINANCE','PROCUREMENT','WAREHOUSE'],model:'vendorBill',number:'billNumber'},
  '/accounting/reports':{title:'Laporan keuangan',roles:['HEAD_ADMIN','FINANCE']},
  '/dashboard':{title:'Dashboard perusahaan',roles:['HEAD_ADMIN','FINANCE']},
  '/pos':{title:'Kasir POS',roles:['HEAD_ADMIN','CASHIER']},
};
/** Untrusted browser context only selects a known page and an existing record in this company. */
export async function verifiedPageContext(db:PrismaClient,user:SessionUser,value:unknown) {
  if(!value||typeof value!=='object')return null;
  const {path,documentId,resource}=value as Record<string,unknown>;
  if(typeof path!=='string'||!Object.hasOwn(pages,path))return null;
  const page=pages[path];if(!page.roles.includes(user.role))return null;
  let document: {reference:string;status:string}|undefined;
  if(page.model&&page.number&&typeof documentId==='string'&&documentId.length<=150) {
    const row=await (db as any)[page.model].findUnique({where:{id:documentId},select:{[page.number]:true,status:true}});
    if(row)document={reference:row[page.number],status:row.status};
  }
  return {page:page.title,path,...(path==='/sales/contacts'?{resource:contactView(typeof resource==='string'?resource:null,user.role)}:{}),...(document?{document}:{})};
}
