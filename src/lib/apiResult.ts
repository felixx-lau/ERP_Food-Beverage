import { hasAllowedOrigin } from './requestOrigin';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, SessionUser } from './auth';
import { recordAuditLog } from "./audit";
import { BusinessError } from './validation';
export function apiFailure(error: unknown) {
  if (error instanceof BusinessError) return NextResponse.json({error:error.message},{status:error.status});
  const code=(error as any)?.code;
  if (code==='P2002') return NextResponse.json({error:'Kode atau kombinasi data sudah terdaftar.'},{status:409});
  if (code==='P2003') return NextResponse.json({error:'Record masih terhubung dengan data lain.'},{status:409});
  if (code==='P2025') return NextResponse.json({error:'Record tidak ditemukan.'},{status:404});
  if (['P2028','P2034','P1008'].includes(code)) return NextResponse.json({error:'Data sedang diproses pengguna lain. Coba kembali dengan request yang sama.'},{status:409});
  if (error instanceof SyntaxError) return NextResponse.json({error:'Format permintaan tidak valid.'},{status:400});
  if (error instanceof Error && error.constructor === Error) return NextResponse.json({error:error.message},{status:400});
  console.error('API operation failed',error);
  return NextResponse.json({error:'Operasi gagal. Periksa data atau coba kembali.'},{status:500});
}
export async function withUser(request: NextRequest, run:(user:SessionUser)=>Promise<unknown>) {
  let user: SessionUser | null = null;
  try {
    user=await getCurrentUser(request);
    if (!user) throw new BusinessError('Silakan login ke perusahaan ini.',401);
    if (!hasAllowedOrigin(request)) throw new BusinessError('Origin tidak diizinkan.',403);
    return NextResponse.json(await run(user));
  } catch (error) {
    if (user && request.method !== "GET") {
      try { await recordAuditLog({actorId:user.id,actorName:user.name,actorRole:user.role,action:"OPERATION_REJECTED",documentType:"API",documentId:request.nextUrl.pathname,notes:error instanceof BusinessError ? error.message : "Operasi ditolak; tidak ada perubahan bisnis tersimpan."}); } catch (auditError) { console.error("Denied operation audit failed",auditError); }
    }
    return apiFailure(error);
  }
}
