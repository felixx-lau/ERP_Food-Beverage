/** Shared restriction applied before route-specific permissions. */
export function accessRestriction(role: string, path: string, method = 'GET'): boolean {
  if (path === '/api/advanced' || path.startsWith('/api/order/')) return true;
  if (role === 'OWNER') {
    if (method === 'GET') {
      const reports = ['/api/dashboard/metrics', '/api/dashboard/charts', '/api/dashboard/reconciliation',
        '/api/accounting/reports', '/api/accounting/general-ledger', '/api/accounting/journal-entries',
        '/api/pos/orders', '/api/pos/sessions', '/api/master/options', '/api/inventory/movements'];
      if (reports.includes(path) || /^\/api\/accounting\/invoices\/[^/]+\/pdf$/.test(path)) return false;
      if (/^\/api\/(?:sales\/orders|purchase\/orders|crm\/leads|products|accounting\/invoices)(?:\/[^/]+)?$/.test(path)) return false;
      if (/^\/api\/documents\/(?:sales|purchase|invoices)\/[^/]+$/.test(path)) return false;
    }
    if (method === 'POST' && /^\/api\/sales\/orders\/[^/]+\/approve-discount$/.test(path)) return false;
    return !(method === 'GET' && ['/api/auth/me', '/api/companies', '/api/dashboard/profit'].includes(path))
      && !(method === 'POST' && path === '/api/auth/logout');
  }
  return false;
}
