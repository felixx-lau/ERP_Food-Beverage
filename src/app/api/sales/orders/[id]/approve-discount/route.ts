import type { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { idempotent } from '@/lib/atomic';
import { decideOrderDiscount } from '@/lib/salesEngine';
import { BusinessError, numberValue } from '@/lib/validation';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(request, async user => {
    if (user.role !== 'OWNER') throw new BusinessError('Hanya Owner yang dapat memutuskan persetujuan diskon (SR-08).', 403);
    const { id } = await params;
    const input = await request.json();
    if (input.decision !== 'APPROVE' && input.decision !== 'REJECT') {
      throw new BusinessError('Pilih keputusan Setujui atau Tolak.');
    }
    const version = numberValue(input.version, 'Versi penawaran', 0, true);
    const order = await idempotent(user, 'DISCOUNT_DECISION:' + id,
      request.headers.get('idempotency-key') || undefined, input,
      () => decideOrderDiscount(id, user, { decision: input.decision, reason: input.reason, version }));
    return { success: true, order };
  });
}
