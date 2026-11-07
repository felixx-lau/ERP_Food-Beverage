import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { prisma } from '@/lib/prisma';
import { permit } from '@/lib/validation';
export async function GET(request:NextRequest){return withUser(request,async user=>{permit(user,['OWNER','WAREHOUSE','FINANCE','PROCUREMENT']);const q=request.nextUrl.searchParams,where:any={};if(q.get('sku'))where.productSku={contains:q.get('sku')};if(q.get('location'))where.OR=[{sourceLocation:q.get('location')},{destLocation:q.get('location')}];const page=Math.max(1,Number(q.get('page'))||1);const [movements,total]=await Promise.all([prisma.stockMove.findMany({where,orderBy:{date:'desc'},skip:(page-1)*25,take:25}),prisma.stockMove.count({where})]);return {success:true,movements,total,pages:Math.max(1,Math.ceil(total/25))};});}
