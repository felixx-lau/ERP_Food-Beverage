import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/apiAuthorization';
import { getCurrentUser } from '@/lib/auth';
import { getActivePrismaClient } from '@/lib/prisma';
import { getCompanyById } from '@/lib/companyManager';
import { createInvoicePdf, invoicePdfFilename } from '@/lib/invoicePdf';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeApi(request);
  if (denied) return denied;
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 });
  try {
    const { id } = await params;
    const db = await getActivePrismaClient();
    const invoice = await db.customerInvoice.findFirst({
      where: { OR: [{ id }, { invoiceNumber: id }] },
      include: { customer: true, salesOrder: true, lines: { include: { product: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice tidak ditemukan.' }, { status: 404 });
    const company = getCompanyById(user.companyId || 'default');
    const pdf = createInvoicePdf(invoice, company);
    return new NextResponse(pdf.output('arraybuffer'), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoicePdfFilename(invoice.invoiceNumber)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'PDF invoice belum dapat dibuat. Silakan coba kembali.' }, { status: 500 });
  }
}
