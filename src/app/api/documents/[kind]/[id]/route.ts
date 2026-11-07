import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { documentTrail,addDocumentNote } from '@/lib/documentTrail';
type Context={params:Promise<{kind:string;id:string}>};
export async function GET(request:NextRequest,{params}:Context){return withUser(request,async user=>{const {kind,id}=await params;return {success:true,...await documentTrail(kind,id,user)};});}
export async function POST(request:NextRequest,{params}:Context){return withUser(request,async user=>{const {kind,id}=await params;return {success:true,note:await addDocumentNote(kind,id,(await request.json()).note,user)};});}
