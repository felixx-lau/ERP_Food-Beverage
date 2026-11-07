import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { prisma } from '@/lib/prisma';
import { permit } from '@/lib/validation';
import { calculateCustomerCreditStatus } from '@/lib/creditControl';
import { getFinancialReconciliation } from '@/lib/dashboardEngine';
export async function GET(request:NextRequest){return withUser(request,async user=>{
  permit(user,['OWNER','FINANCE']);
  const accounts=await prisma.account.findMany({include:{journalItems:{where:{journalEntry:{state:'POSTED'}}}},orderBy:{code:'asc'}});
  const trialBalance=accounts.map(a=>{const debit=a.journalItems.reduce((n,l)=>n+l.debit,0),credit=a.journalItems.reduce((n,l)=>n+l.credit,0);const normal=['ASSET','EXPENSE','CONTRA_INCOME'].includes(a.type)?debit-credit:credit-debit;return {code:a.code,name:a.name,type:a.type,debit,credit,balance:normal,cachedBalance:a.currentBalance,matched:normal===a.currentBalance};});
  const revenue=trialBalance.filter(a=>a.type==='INCOME').reduce((n,a)=>n+a.balance,0),returns=trialBalance.filter(a=>a.type==='CONTRA_INCOME').reduce((n,a)=>n+a.balance,0),expenses=trialBalance.filter(a=>a.type==='EXPENSE').reduce((n,a)=>n+a.balance,0);
  const customers=await prisma.contact.findMany({where:{type:'CUSTOMER'}}),vendors=await prisma.contact.findMany({where:{type:'VENDOR'}});
  const receivables=await Promise.all(customers.map(async c=>({id:c.id,name:c.name,...await calculateCustomerCreditStatus(c.id)})));
  const payables=await Promise.all(vendors.map(async v=>{const bills=await prisma.vendorBill.findMany({where:{vendorId:v.id,status:{in:['POSTED','PAID']},isPosted:true}});return {id:v.id,name:v.name,outstanding:v.openPayable+bills.reduce((n,b)=>n+b.outstandingAmount,0)};}));
  return {success:true,trialBalance,profitAndLoss:{revenue,returns,expenses,profit:revenue-returns-expenses},receivables,payables,reconciliation:await getFinancialReconciliation()};
});}
