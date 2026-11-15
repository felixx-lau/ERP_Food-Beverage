import type { PrismaClient } from '@prisma/client';
import type { SessionUser } from '@/lib/auth';
const pages:Record<string,{title:string;roles:string[];model?:string;number?:string}>={
  '/':{title:'Beranda dan prioritas pekerjaan',roles:['OWNER','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER']},
  '/sales/orders':{title:'Pesanan penjualan',roles:['OWNER','SALES','WAREHOUSE','FINANCE'],model:'salesOrder',number:'orderNumber'},
  '/purchase/orders':{title:'Pesanan pembelian',roles:['OWNER','PROCUREMENT','WAREHOUSE','FINANCE'],model:'purchaseOrder',number:'poNumber'},
  '/inventory/delivery':{title:'Pengiriman barang',roles:['OWNER','WAREHOUSE','FINANCE','SALES'],model:'deliveryOrder',number:'deliveryNumber'},
  '/inventory/receipts':{title:'Penerimaan barang',roles:['OWNER','WAREHOUSE','FINANCE','PROCUREMENT'],model:'goodsReceipt',number:'receiptNumber'},
  '/inventory/transfers':{title:'Transfer stok',roles:['OWNER','WAREHOUSE','PROCUREMENT','FINANCE','SALES'],model:'internalTransfer',number:'transferNumber'},
  '/inventory/products':{title:'Stok produk per lokasi',roles:['OWNER','WAREHOUSE','PROCUREMENT','FINANCE','SALES']},
  '/accounting/invoices':{title:'Invoice pelanggan',roles:['OWNER','FINANCE','SALES','WAREHOUSE'],model:'customerInvoice',number:'invoiceNumber'},
  '/accounting/vendor-bills':{title:'Tagihan vendor',roles:['OWNER','FINANCE','PROCUREMENT','WAREHOUSE'],model:'vendorBill',number:'billNumber'},
  '/accounting/reports':{title:'Laporan keuangan',roles:['OWNER','FINANCE']},
  '/dashboard':{title:'Dashboard perusahaan',roles:['OWNER','FINANCE']},
  '/pos':{title:'Kasir POS',roles:['OWNER','CASHIER']},
};
/** Untrusted browser context only selects a known page and an existing record in this company. */
export async function verifiedPageContext(db:PrismaClient,user:SessionUser,value:unknown) {
  if(!value||typeof value!=='object')return null;
  const {path,documentId}=value as Record<string,unknown>;
  if(typeof path!=='string'||!Object.hasOwn(pages,path))return null;
  const page=pages[path];if(!page.roles.includes(user.role))return null;
  let document: {reference:string;status:string}|undefined;
  if(page.model&&page.number&&typeof documentId==='string'&&documentId.length<=150) {
    const row=await (db as any)[page.model].findUnique({where:{id:documentId},select:{[page.number]:true,status:true}});
    if(row)document={reference:row[page.number],status:row.status};
  }
  return {page:page.title,path,...(document?{document}:{})};
}
