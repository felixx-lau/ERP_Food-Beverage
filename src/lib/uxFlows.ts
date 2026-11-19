import {invoiceChoices} from './invoiceChoices';
/** Presentation decisions shared by contact navigation and document handoffs. */
export function contactView(value:string|null,role:string,initial='customers') {
  if(value==='customers'||value==='vendors')return value;
  return role==='PROCUREMENT'?'vendors':initial;
}
export type NextStep={text:string;href?:string;label?:string;roles?:string[]};
export function documentNextStep(kind:string,r:any):NextStep|null {
  if(r.status==='CANCELLED')return null;
  if(['invoices','bills'].includes(kind)&&r.isPosted){
    return r.outstandingAmount>0?{text:'Finance melanjutkan pencatatan pembayaran. Dokumen sudah terposting, tetapi belum lunas.',href:'/accounting/payments',label:'Buka pembayaran',roles:['HEAD_ADMIN','FINANCE']}:{text:'Tagihan sudah tidak memiliki sisa pembayaran. Riwayat tetap dapat diperiksa.'};
  }
  if(kind==='sales'&&r.status==='DRAFT'&&r.discountPercent>10&&!r.discountApproved)return {text:'Diskon di atas 10% menunggu persetujuan Owner atau Head Admin. Setelah disetujui, Sales dapat mengonfirmasi pesanan.'};
  if(['sales','purchase'].includes(kind)&&['CONFIRMED','DONE'].includes(r.status)&&r.lines?.length){
    const sales=kind==='sales';
    const documents=(sales?r.invoices:r.bills)?.filter((d:any)=>d.status!=='CANCELLED')||[];
    const received=r.lines.every((l:any)=>sales?l.deliveredQty>=l.quantity:l.receivedQty>=l.orderedQty);
    const newBillable=sales?invoiceChoices(r).some(l=>l.billable>0):r.lines.some((l:any)=>l.receivedQty>documents.reduce((n:number,b:any)=>n+(b.lines||[]).filter((x:any)=>x.productSku===l.productSku).reduce((m:number,x:any)=>m+x.quantity,0),0));
    if(received){
      const href=sales?'/accounting/invoices':'/accounting/vendor-bills';
      if(newBillable||!documents.length)return {text:sales?'Seluruh barang sudah dikirim. Finance memeriksa jumlah yang belum ditagih dan menyiapkan tagihan pelanggan.':'Seluruh barang sudah diterima. Finance mencocokkan pesanan dan penerimaan sebelum membuat tagihan vendor.',href,label:sales?'Periksa tagihan pelanggan':'Periksa tagihan vendor',roles:['HEAD_ADMIN','FINANCE',...(sales?['SALES']:[])]};
      if(documents.some((d:any)=>!d.isPosted))return {text:'Barang sudah dipenuhi dan tagihan sudah dibuat. Finance perlu memeriksa tagihan yang masih draft sebelum memposting ke pembukuan.',href,label:'Periksa draft tagihan',roles:['HEAD_ADMIN','FINANCE']};
      if(documents.some((d:any)=>d.outstandingAmount>0))return {text:'Barang sudah dipenuhi dan tagihan sudah diposting. Masih ada sisa pembayaran; Finance melanjutkan pencatatan pembayaran.',href:'/accounting/payments',label:'Buka pembayaran',roles:['HEAD_ADMIN','FINANCE']};
      return {text:'Barang sudah dipenuhi dan tagihan terkait tidak memiliki sisa pembayaran. Periksa riwayat untuk penelusuran.'};
    }
  }
  if(kind==='sales'&&r.status==='CONFIRMED')return {text:'Tugas berikutnya: Gudang menyiapkan dan memvalidasi pengiriman. Konfirmasi pesanan belum berarti barang sudah dikirim.',href:'/inventory/delivery',label:'Lihat daftar pengiriman',roles:['HEAD_ADMIN','WAREHOUSE']};
  if(kind==='purchase'&&r.status==='CONFIRMED')return {text:'Tugas berikutnya: Gudang memeriksa barang saat tiba, lalu memvalidasi penerimaan. Konfirmasi pembelian belum menambah stok.',href:'/inventory/receipts',label:'Lihat daftar penerimaan',roles:['HEAD_ADMIN','WAREHOUSE']};
  if((kind==='deliveries'&&r.status==='DONE')||(kind==='sales'&&r.status==='DONE'))return {text:'Tugas berikutnya: Finance memeriksa tagihan untuk jumlah barang yang sudah dikirim. Pengiriman selesai belum berarti pelanggan sudah membayar.',href:'/accounting/invoices',label:'Buka tagihan pelanggan',roles:['HEAD_ADMIN','FINANCE','SALES']};
  if((kind==='receipts'&&r.status==='DONE')||(kind==='purchase'&&r.status==='DONE'))return {text:'Tugas berikutnya: Finance mencocokkan pesanan, barang diterima, dan tagihan vendor sebelum mencatat tagihan.',href:'/accounting/vendor-bills',label:'Buka tagihan vendor',roles:['HEAD_ADMIN','FINANCE']};
  return null;
}

export function canCancelDocument(kind:string,r:any) {
  if(kind==='sales')return !(r.lines||[]).some((l:any)=>l.deliveredQty>0)&&!(r.invoices||[]).some((d:any)=>d.status!=='CANCELLED');
  if(kind==='purchase')return !(r.lines||[]).some((l:any)=>l.receivedQty>0)&&!(r.bills||[]).some((d:any)=>d.status!=='CANCELLED');
  return true;
}
