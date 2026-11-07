import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { reverseFinancial,createManualJournal } from '@/lib/financialCorrections';
import { idempotent } from '@/lib/atomic';
import { permit } from '@/lib/validation';
export async function POST(request:NextRequest) {return withUser(request,async user=>{permit(user,['OWNER','FINANCE']);const body=await request.json();return {success:true,...await idempotent(user,'FINANCIAL_CORRECTION',request.headers.get('idempotency-key')||undefined,body,async()=>body.action==='journal'?{record:await createManualJournal(body,user)}:reverseFinancial(body.kind,body.id,body.reason,user))};});}
