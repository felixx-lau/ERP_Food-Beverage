export const DISCOUNT_APPROVAL_LIMIT = 10;

export function mayViewQuotationMargin(role?: string) {
  return ['OWNER', 'HEAD_ADMIN', 'FINANCE', 'SALES'].includes(role ?? '');
}
