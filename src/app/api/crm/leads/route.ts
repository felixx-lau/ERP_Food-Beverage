import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { permit } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { createMaster } from '@/lib/masterData';
import { idempotent } from '@/lib/atomic';
export const GET=(request:NextRequest)=>withUser(request,async user=>{permit(user,['OWNER','SALES']);return {success:true,leads:await prisma.crmLead.findMany({where:{archivedAt:null},include:{contact:true},orderBy:{id:'asc'}})};});
export const POST=(request:NextRequest)=>withUser(request,async user=>{permit(user,['OWNER','SALES']);const body=await request.json();return {success:true,lead:await idempotent(user,'CREATE_CRM_LEAD',request.headers.get('idempotency-key')||undefined,body,()=>createMaster('leads',body,user))};});
