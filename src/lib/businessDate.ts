export const BUSINESS_TIME_ZONE = "Asia/Jakarta";
export function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find(p => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function businessDayStart(value = businessDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Tanggal harus dalam format YYYY-MM-DD.");
  const result = new Date(`${value}T00:00:00+07:00`);
  if (!Number.isFinite(result.getTime()) || businessDate(result) !== value) throw new Error("Tanggal tidak valid.");
  return result;
}
export function businessDayEnd(value = businessDate()) { return new Date(businessDayStart(value).getTime() + 86_400_000 - 1); }
