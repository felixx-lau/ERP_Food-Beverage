import { hasAllowedOrigin } from './requestOrigin';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { recordAuditLog } from './audit';

export async function authorizeApi(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Silakan login ke perusahaan ini.' }, { status: 401 });
  const path = request.nextUrl.pathname;
  const read = request.method === 'GET';
  let roles: string[] = [];
  if (path.startsWith('/api/auth/') || path === '/api/chatbot') roles = ['OWNER','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER'];
  else if (path.startsWith('/api/companies') || path.startsWith('/api/users') || path.startsWith('/api/seed')) roles = ['OWNER'];
  else if (path.startsWith('/api/products')) roles = read ? ['OWNER','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER'] : ['OWNER','WAREHOUSE'];
  else if (path.startsWith('/api/contacts')) roles = read ? ['OWNER','SALES','WAREHOUSE','PROCUREMENT','FINANCE'] : ['OWNER','SALES','PROCUREMENT'];
  else if (path.startsWith('/api/crm')) roles = ['OWNER','SALES'];
  else if (path.startsWith('/api/sales')) roles = read ? ['OWNER','SALES','WAREHOUSE','FINANCE'] : path.endsWith('/approve-discount') ? ['OWNER'] : ['OWNER','SALES'];
  else if (path.startsWith('/api/purchase')) roles = read ? ['OWNER','PROCUREMENT','WAREHOUSE','FINANCE'] : ['OWNER','PROCUREMENT'];
  else if (path.startsWith('/api/inventory')) roles = read ? ['OWNER','WAREHOUSE','PROCUREMENT','FINANCE','SALES'] : ['OWNER','WAREHOUSE'];
  else if (path.startsWith('/api/returns')) roles = read ? ['OWNER','WAREHOUSE','FINANCE','SALES'] : path.endsWith('/process') ? ['OWNER','FINANCE'] : ['OWNER','WAREHOUSE'];
  else if (path.startsWith('/api/pos')) roles = ['OWNER','CASHIER'];
  else if (path.startsWith('/api/accounting/invoices')) roles = read ? ['OWNER','FINANCE','SALES','WAREHOUSE'] : ['OWNER','FINANCE'];
  else if (path.startsWith('/api/accounting/vendor-bills')) roles = read ? ['OWNER','FINANCE','PROCUREMENT','WAREHOUSE'] : ['OWNER','FINANCE'];
  else if (path.startsWith('/api/accounting')) roles = ['OWNER','FINANCE'];
  else if (path.startsWith('/api/dashboard/reconciliation')) roles = ['OWNER','FINANCE'];
  else if (path.startsWith('/api/dashboard')) roles = ['OWNER','FINANCE'];
  else if (path.startsWith('/api/audit')) roles = ['OWNER','FINANCE','SALES','PROCUREMENT','WAREHOUSE','CASHIER'];
  if (!read) {
    if (!hasAllowedOrigin(request)) return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
  }
  if (roles.includes(user.role)) return null;
  await recordAuditLog({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'ACCESS_DENIED', documentType: 'API', documentId: path, notes: `${request.method} ditolak.` });
  return NextResponse.json({ error: 'Akses ditolak (SR-15): role Anda tidak memiliki izin.' }, { status: 403 });
}
