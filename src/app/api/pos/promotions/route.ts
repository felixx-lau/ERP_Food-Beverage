import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/apiAuthorization';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { atomic } from '@/lib/atomic';

export async function GET(request: NextRequest) {
  const denied = await authorizeApi(request); if (denied) return denied;
  const [accounts, coupons, contacts] = await Promise.all([
    prisma.loyaltyAccount.findMany(), prisma.promotionCoupon.findMany({where:{usedOrderId:null}}),
    prisma.contact.findMany({where:{archivedAt:null, type:'CUSTOMER'},select:{id:true,name:true},orderBy:{name:'asc'}}),
  ]);
  return NextResponse.json({accounts,coupons,contacts});
}
export async function POST(request: NextRequest) {
  const denied = await authorizeApi(request); if (denied) return denied;
  const user = await getCurrentUser(request);
  if (user?.role !== 'OWNER') return NextResponse.json({error:'Hanya owner dapat membuat akun dan kupon.'},{status:403});
  try {
    const body = await request.json();
    const result = await atomic(async () => {
      if (body.type === 'account') {
        const contact = await prisma.contact.findFirst({where:{id:body.contactId,archivedAt:null,type:'CUSTOMER'}});
        if (!contact) throw new Error('Pelanggan tidak ditemukan.');
        return prisma.loyaltyAccount.create({data:{contactId:contact.id}});
      }
      if (body.type === 'coupon') {
        const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
        if (!/^[A-Z0-9-]{1,40}$/.test(code) || !Number.isSafeInteger(body.discountAmount) || body.discountAmount <= 0) throw new Error('Kode atau nilai kupon tidak valid.');
        return prisma.promotionCoupon.create({data:{code,discountAmount:body.discountAmount}});
      }
      throw new Error('Jenis promosi tidak valid.');
    });
    return NextResponse.json({result});
  } catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : 'Gagal menyimpan promosi.'},{status:400}); }
}
