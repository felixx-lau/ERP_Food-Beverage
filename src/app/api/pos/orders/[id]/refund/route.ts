import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { refundPosOrder } from '@/lib/posRefund';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {return withUser(request,async user=>({success:true,...await refundPosOrder((await params).id,(await request.json()).reason,user)}));}
