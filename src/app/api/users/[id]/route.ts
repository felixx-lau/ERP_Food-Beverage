import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { saveTeamMember } from '@/lib/team';
export const PATCH=(request:NextRequest,context:{params:Promise<{id:string}>})=>withUser(request,async user=>saveTeamMember((await context.params).id,await request.json(),user));
