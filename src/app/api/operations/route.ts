import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { getActivePrismaClient } from '@/lib/prisma';
import { operationalOverview } from '@/lib/operationalOverview';
export async function GET(request:NextRequest) {
  return withUser(request,async user=>({success:true,...await operationalOverview(await getActivePrismaClient(),user)}));
}
