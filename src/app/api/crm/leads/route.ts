import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { permit } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { createMaster } from '@/lib/masterData';
import { idempotent } from '@/lib/atomic';
export const GET = (request: NextRequest) => withUser(request, async user => {
  permit(user, ['OWNER', 'HEAD_ADMIN', 'SALES']);
  const status = request.nextUrl.searchParams.get('status');
  const where = status === 'all' ? {} : { archivedAt: null };
  const leads = await prisma.crmLead.findMany({
    where, include: { contact: true, _count: { select: { salesOrders: true } } }, orderBy: { id: 'asc' },
  });
  return { success: true, leads };
});
export const POST=(request:NextRequest)=>withUser(request,async user=>{permit(user,['HEAD_ADMIN','SALES']);const body=await request.json();return {success:true,lead:await idempotent(user,'CREATE_CRM_LEAD',request.headers.get('idempotency-key')||undefined,body,()=>createMaster('leads',body,user))};});
