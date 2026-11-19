import { prisma } from './prisma';
import { businessDayStart,businessDayEnd,businessDate } from './businessDate';
import { BusinessError } from './validation';
/** All statements derive from posted journals, never cached account balances. */
export async function financialStatements(start=businessDate().slice(0,7)+'-01',end=businessDate()){
 const from=businessDayStart(start),to=businessDayEnd(end);if(from>to)throw new BusinessError('Periode laporan tidak valid.');
 const accounts=await prisma.account.findMany({include:{journalItems:{where:{journalEntry:{state:'POSTED',date:{lte:to}}}}},orderBy:{code:'asc'}});
 const balances=accounts.map(a=>({code:a.code,name:a.name,type:a.type,balance:a.journalItems.reduce((n,i)=>n+(['ASSET','EXPENSE','CONTRA_INCOME'].includes(a.type)?i.debit-i.credit:i.credit-i.debit),0)}));
 const assets=balances.filter(a=>a.type==='ASSET'),liabilities=balances.filter(a=>a.type==='LIABILITY'),equity=balances.filter(a=>a.type==='EQUITY');
 const retainedEarnings=balances.reduce((n,a)=>n+(a.type==='INCOME'?a.balance:['EXPENSE','CONTRA_INCOME'].includes(a.type)?-a.balance:0),0);
 const totalAssets=assets.reduce((n,a)=>n+a.balance,0),totalLiabilities=liabilities.reduce((n,a)=>n+a.balance,0),totalEquity=equity.reduce((n,a)=>n+a.balance,0)+retainedEarnings;
 const cashCodes=accounts.filter(a=>a.type==='ASSET'&&(/kas|bank|cash/i.test(a.name)||a.code==='1010')).map(a=>a.code);
 const journals=await prisma.journalEntry.findMany({where:{state:'POSTED',date:{lte:to}},include:{items:{include:{account:true}}},orderBy:{date:'asc'}});
 let opening=0,closing=0,openingAdjustments=0;const flows:{id:string;number:string;date:Date;category:string;amount:number;source:string}[]=[];
 for(const j of journals){const amount=j.items.filter(i=>cashCodes.includes(i.accountCode)).reduce((n,i)=>n+i.debit-i.credit,0);closing+=amount;if(j.date<from){opening+=amount;continue;}if(!amount)continue;if(j.isOpening){openingAdjustments+=amount;flows.push({id:j.id,number:j.entryNumber,date:j.date,category:'OPENING',amount,source:j.sourceDocument});continue;}
  const counterpart=j.items.filter(i=>!cashCodes.includes(i.accountCode));
  // Mixed journals are shown for review rather than silently assigned a misleading class.
  const kinds=new Set(counterpart.map(i=>i.account.type==='EQUITY'||(/pinjaman|loan|modal/i.test(i.account.name)&&i.account.type==='LIABILITY')?'FINANCING':i.account.type==='ASSET'&&!['1020','1030','1040'].includes(i.accountCode)?'INVESTING':'OPERATING'));
  const category=kinds.size===1?[...kinds][0]:'REVIEW';flows.push({id:j.id,number:j.entryNumber,date:j.date,category,amount,source:j.sourceDocument});
 }
 const net=flows.filter(f=>f.category!=='OPENING').reduce((n,f)=>n+f.amount,0);
 const groups=['OPERATING','INVESTING','FINANCING','REVIEW'].map(category=>({category,net:flows.filter(f=>f.category===category).reduce((n,f)=>n+f.amount,0)}));
 return {period:{start,end},balanceSheet:{asOf:end,assets,liabilities,equity,retainedEarnings,totalAssets,totalLiabilities,totalEquity,difference:totalAssets-totalLiabilities-totalEquity},cashFlow:{cashCodes,opening,openingAdjustments,closing,groups,flows,net,difference:closing-opening-openingAdjustments-net,note:'Metode langsung dari pergerakan akun kas/bank. Kategori berdasarkan akun lawan; jurnal campuran masuk Perlu ditinjau. Saldo sebelum periode menjadi kas awal. Jurnal pembukaan dalam periode ditampilkan terpisah sebagai saldo migrasi; tidak dihitung sebagai arus operasi, investasi, atau pendanaan.'}};
}
