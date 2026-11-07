import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { getMaster, changeMaster } from '@/lib/masterData';
type Context={params:Promise<{resource:string;id:string}>};
export async function GET(request:NextRequest,{params}:Context) {
  return withUser(request,async user=>{const {resource,id}=await params;return {success:true,...await getMaster(resource,id,user)};});
}
export async function PATCH(request:NextRequest,{params}:Context) {
  return withUser(request,async user=>{const {resource,id}=await params;return {success:true,record:await changeMaster(resource,id,await request.json(),user)};});
}
export async function DELETE(request:NextRequest,{params}:Context) {
  return withUser(request,async user=>{const {resource,id}=await params;return {success:true,...await changeMaster(resource,id,{version:Number(request.nextUrl.searchParams.get('version') ?? NaN)},user,true)};});
}
