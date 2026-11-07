import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from './prisma';
import { atomic } from './atomic';
import { Actor,permit,textValue,numberValue,BusinessError } from './validation';
import { recordAuditLog } from './audit';
export const publicUser={id:true,name:true,email:true,role:true,active:true,sessionVersion:true,createdAt:true} as const;
export async function saveTeamMember(id:string|null,input:any,actor:Actor){
 permit(actor,['OWNER']);
 return atomic(async()=>{
  const before=id?await prisma.user.findUnique({where:{id},select:publicUser}):null;
  if(id&&!before)throw new BusinessError('Pengguna tidak ditemukan.',404);
  if(before){numberValue(input.sessionVersion,'Versi sesi',0,true);if(input.sessionVersion!==before.sessionVersion)throw new BusinessError('Akun telah berubah. Muat ulang.',409);}
  const name=textValue(input.name??before?.name,'Nama',true,120),email=textValue(input.email??before?.email,'Email',true,200).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new BusinessError('Email tidak valid.');
  const role=input.role??before?.role;
  if(!Object.values(Role).includes(role))throw new BusinessError('Role tidak valid.');
  const active=input.active??before?.active??true;
  if(typeof active!=='boolean')throw new BusinessError('Status akun tidak valid.');
  if(before?.role==='OWNER'&&before.active&&(!active||role!=='OWNER')){
   if(await prisma.user.count({where:{role:'OWNER',active:true}})<=1)throw new BusinessError('Minimal satu Owner aktif harus dipertahankan.',409);
  }
  const password=input.password;
  if(!before||password){if(typeof password!=='string'||password.length<10||password.length>128)throw new BusinessError('Password wajib 10–128 karakter.');}
  const passwordHash=password?await bcrypt.hash(password,12):undefined;
  const data={name,email,role,active,...(passwordHash?{passwordHash}:{})};
  const record=id?await prisma.user.update({where:{id},data:{...data,sessionVersion:{increment:1}},select:publicUser}):await prisma.user.create({data:data as any,select:publicUser});
  await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as Role,action:id?'UPDATE_USER':'CREATE_USER',documentType:'USER',documentId:record.id,beforeData:before,afterData:record,notes:'Perubahan akun. Sesi terdahulu dicabut setelah pembaruan.'});
  return {success:true,user:record};
 });
}
