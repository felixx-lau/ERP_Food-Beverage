import type { PrismaClient } from '@prisma/client';
import { businessDate, businessDayStart, businessDayEnd } from './businessDate';
import { BusinessError } from './validation';
export async function financialSummary(db: PrismaClient, start = businessDate().slice(0,7)+'-01', end = businessDate()) {
  const from=businessDayStart(start), to=businessDayEnd(end);
  if(from>to) throw new BusinessError('Tanggal mulai tidak boleh melebihi tanggal akhir.');
  const rows=await db.journalItem.findMany({where:{journalEntry:{state:'POSTED',isOpening:false,date:{gte:from,lte:to}},account:{type:{in:['INCOME','CONTRA_INCOME','EXPENSE']}}},select:{debit:true,credit:true,account:{select:{type:true}},journalEntry:{select:{entryNumber:true}}}});
  const revenue=rows.filter(r=>r.account.type==='INCOME').reduce((n,r)=>n+r.credit-r.debit,0);
  const returns=rows.filter(r=>r.account.type==='CONTRA_INCOME').reduce((n,r)=>n+r.debit-r.credit,0);
  const expenses=rows.filter(r=>r.account.type==='EXPENSE').reduce((n,r)=>n+r.debit-r.credit,0);
  return {asOf:new Date().toISOString(),period:{start,end,timeZone:'Asia/Jakarta'},currency:'IDR',revenue,returns,expenses,profit:revenue-returns-expenses,journalCount:new Set(rows.map(r=>r.journalEntry.entryNumber)).size,source:'Jurnal POSTED dalam periode, tanpa jurnal pembukaan. Pendapatan tidak mencakup PBJT; bukan arus kas.'};
}

export type FinancialSummary = Awaited<ReturnType<typeof financialSummary>>;
