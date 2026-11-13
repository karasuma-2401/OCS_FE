/** Thirty calendar days including today, using the same timezone as the API. */
export function nextThirtyDays(now = new Date()): { expiresFrom: string; expiresTo: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  const expiresFrom = `${part('year')}-${part('month')}-${part('day')}`;
  const end = new Date(`${expiresFrom}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 29);
  return { expiresFrom, expiresTo: end.toISOString().slice(0, 10) };
}
