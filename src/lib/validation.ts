import { Role } from '@prisma/client';
export type Actor = { id?: string; name: string; role: Role | string };
export class BusinessError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function permit(actor: Actor, roles: string[]) {
  if (!actor || !roles.includes(actor.role)) throw new BusinessError('Akses ditolak (SR-15).', 403);
}
export function textValue(value: unknown, label: string, required = true, max = 250): string {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) throw new BusinessError(`${label} tidak valid.`);
  return value.trim();
}
export function numberValue(value: unknown, label: string, min = 0, integer = false, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) throw new BusinessError(`${label} harus ${integer ? 'bilangan bulat ' : ''}antara ${min} dan ${max}.`);
  return value;
}
export function quantity(value: unknown, allowZero = false) { return numberValue(value, 'Kuantitas', allowZero ? 0 : 1, true, 100000000); }
export function money(value: unknown) { return numberValue(value, 'Nilai Rupiah', 0, true, 1000000000000); }
export function discount(value: unknown) { return numberValue(value, 'Diskon', 0, false, 20); }
export function uniqueLines<T>(lines: T[], key: (line: T) => string): T[] {
  if (!Array.isArray(lines) || !lines.length || lines.length > 500) throw new BusinessError('Isi 1–500 baris transaksi.');
  const seen = new Set<string>();
  for (const line of lines) { const id = key(line); if (!id || seen.has(id)) throw new BusinessError('SKU atau baris transaksi duplikat tidak diizinkan.'); seen.add(id); }
  return lines;
}
export function editable(status: string) { if (status !== 'DRAFT') throw new BusinessError('Hanya dokumen Draft yang dapat diubah atau dibatalkan.', 409); }
