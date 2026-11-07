import { permit } from "@/lib/validation";
import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { listMaster, createMaster, masterConfig } from '@/lib/masterData';
import { idempotent } from '@/lib/atomic';
type Context={params:Promise<{resource:string}>};
export async function GET(request:NextRequest,{params}:Context) {
  return withUser(request,async user=>({success:true,...await listMaster((await params).resource,user,request.nextUrl.searchParams)}));
}
export async function POST(request:NextRequest,{params}:Context) {
  return withUser(request,async user=>{
    const {resource}=await params, body=await request.json();
    permit(user,[...masterConfig(resource).roles]);
    const record=await idempotent(user,`CREATE_MASTER_${resource}`,request.headers.get('idempotency-key')||undefined,body,()=>createMaster(resource,body,user));
    return {success:true,record};
  });
}
