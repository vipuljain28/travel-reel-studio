const buckets = new Map<string, { n: number; t: number }>();

export function allow(ip: string, limit = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  const row = buckets.get(ip);
  if (!row || now - row.t > windowMs) {
    buckets.set(ip, { n: 1, t: now });
    return true;
  }
  row.n += 1;
  return row.n <= limit;
}
