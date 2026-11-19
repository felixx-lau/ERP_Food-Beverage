import { accessRestriction } from './accessPolicy';
import { hasAllowedOrigin } from './requestOrigin';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import { recordAuditLog } from './audit';

export async function authorizeApi(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: 'Silakan login ke perusahaan ini.' }, { status: 401 });
  const path = request.nextUrl.pathname;
  if (accessRestriction(user.role, path, request.method)) return NextResponse.json({ error: 'Fitur ini tidak tersedia untuk akun Anda.' }, { status: 403 });
  const read = request.method === 'GET';
  let roles: string[] = [];
  if (path.startsWith('/api/auth/') || (path === '/api/chatbot' || path === '/api/chatbot/health')) roles = ['HEAD_ADMIN','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER','KITCHEN'];
  else if (path.startsWith('/api/companies') || path.startsWith('/api/users') || path.startsWith('/api/seed')) roles = ['HEAD_ADMIN'];
  else if (path.startsWith('/api/products')) roles = read ? ['HEAD_ADMIN','SALES','WAREHOUSE','PROCUREMENT','FINANCE','CASHIER','KITCHEN'] : ['HEAD_ADMIN','WAREHOUSE'];
  else if (path.startsWith('/api/contacts')) roles = read ? ['HEAD_ADMIN','SALES','WAREHOUSE','PROCUREMENT','FINANCE'] : ['HEAD_ADMIN','SALES','PROCUREMENT'];
  else if (path.startsWith('/api/crm')) roles = ['HEAD_ADMIN','SALES'];
  else if (path.startsWith('/api/sales')) roles = read ? ['HEAD_ADMIN','SALES','WAREHOUSE','FINANCE'] : path.endsWith('/approve-discount') ? ['HEAD_ADMIN'] : ['HEAD_ADMIN','SALES'];
  else if (path.startsWith('/api/purchase')) roles = read ? ['HEAD_ADMIN','PROCUREMENT','WAREHOUSE','FINANCE'] : ['HEAD_ADMIN','PROCUREMENT'];
  else if (path.startsWith('/api/inventory')) roles = read ? ['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE','SALES'] : ['HEAD_ADMIN','WAREHOUSE'];
  else if (path.startsWith('/api/returns')) roles = read ? ['HEAD_ADMIN','WAREHOUSE','FINANCE','SALES'] : path.endsWith('/process') ? ['HEAD_ADMIN','FINANCE'] : ['HEAD_ADMIN','WAREHOUSE'];
  else if (path.startsWith('/api/pos')) roles = ['HEAD_ADMIN','CASHIER'];
  else if (path.startsWith('/api/accounting/invoices')) roles = read ? ['HEAD_ADMIN','FINANCE','SALES','WAREHOUSE'] : ['HEAD_ADMIN','FINANCE'];
  else if (path.startsWith('/api/accounting/vendor-bills')) roles = read ? ['HEAD_ADMIN','FINANCE','PROCUREMENT','WAREHOUSE'] : ['HEAD_ADMIN','FINANCE'];
  else if (path.startsWith('/api/accounting')) roles = ['HEAD_ADMIN','FINANCE'];
  else if (path.startsWith('/api/dashboard/reconciliation')) roles = ['HEAD_ADMIN','FINANCE'];
  else if (path.startsWith('/api/dashboard')) roles = ['HEAD_ADMIN','FINANCE'];
  else if (path.startsWith('/api/audit')) roles = ['HEAD_ADMIN','FINANCE','SALES','PROCUREMENT','WAREHOUSE','CASHIER'];
  if (!read) {
    if (!hasAllowedOrigin(request)) return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
  }
  if (user.role === 'HEAD_ADMIN' || roles.includes(user.role) || (user.role === 'OWNER' && !accessRestriction(user.role, path, request.method))) return null;
  await recordAuditLog({ actorId: user.id, actorName: user.name, actorRole: user.role, action: 'ACCESS_DENIED', documentType: 'API', documentId: path, notes: `${request.method} ditolak.` });
  return NextResponse.json({ error: 'Akses ditolak (SR-15): role Anda tidak memiliki izin.' }, { status: 403 });
}
