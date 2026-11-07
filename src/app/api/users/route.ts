import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { permit } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { publicUser,saveTeamMember } from '@/lib/team';
export const GET=(request:NextRequest)=>withUser(request,async user=>{permit(user,['OWNER']);return {success:true,users:await prisma.user.findMany({select:publicUser,orderBy:{createdAt:'asc'}})};});
export const POST=(request:NextRequest)=>withUser(request,async user=>saveTeamMember(null,await request.json(),user));
