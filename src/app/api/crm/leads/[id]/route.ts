import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { permit,BusinessError } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { changeMaster } from '@/lib/masterData';
type Context={params:Promise<{id:string}>};
export const GET=(request:NextRequest,{params}:Context)=>withUser(request,async user=>{permit(user,['OWNER','SALES']);const lead=await prisma.crmLead.findUnique({where:{id:(await params).id},include:{contact:true,salesOrders:true}});if(!lead)throw new BusinessError('Lead tidak ditemukan.',404);return {success:true,lead};});
export const PATCH=(request:NextRequest,{params}:Context)=>withUser(request,async user=>({success:true,lead:await changeMaster('leads',(await params).id,await request.json(),user)}));
export const DELETE=(request:NextRequest,{params}:Context)=>withUser(request,async user=>({success:true,...await changeMaster('leads',(await params).id,{version:Number(request.nextUrl.searchParams.get('version')??NaN)},user,true)}));
