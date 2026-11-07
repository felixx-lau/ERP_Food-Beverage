import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { adjustStock } from '@/lib/inventoryEngine';
import { idempotent } from '@/lib/atomic';
import { permit } from '@/lib/validation';
export async function POST(request:NextRequest){return withUser(request,async user=>{permit(user,['OWNER','WAREHOUSE']);const body=await request.json();return {success:true,...await idempotent(user,'STOCK_ADJUSTMENT',request.headers.get('idempotency-key')||undefined,body,()=>adjustStock({...body,actor:user}))};});}
