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
export function resetRateLimit() { buckets.clear(); }
export function rateLimitMiddleware(limit = 120) {
  return (req: { ip?: string; socket?: { remoteAddress?: string }; path?: string }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    if (req.path === "/health" || req.path === "/api/v1/health") return next();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!allow(ip, limit)) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    next();
  };
}
