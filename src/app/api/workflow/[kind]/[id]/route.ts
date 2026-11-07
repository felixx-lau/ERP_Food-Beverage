import { permit } from "@/lib/validation";
import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { documentAction, documentRoles } from '@/lib/documentWorkflow';
import { idempotent } from '@/lib/atomic';
export async function POST(request:NextRequest,{params}:{params:Promise<{kind:string;id:string}>}) {
  return withUser(request,async user=>{const {kind,id}=await params,body=await request.json();permit(user,documentRoles(kind));return {success:true,...await idempotent(user,`WORKFLOW_${kind}_${id}`,request.headers.get('idempotency-key')||undefined,body,()=>documentAction(kind,id,body,user))};});
}
