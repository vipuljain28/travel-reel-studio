export class QuotaExceededError extends Error {
  constructor(public readonly provider: string) {
    super(`Application safety budget reached for ${provider}`);
  }
}
export class Budget {
  constructor(public readonly id: string, public readonly limit: number, public used = 0) {}
  remaining() { return Math.max(0, this.limit - this.used); }
  canSpend(n = 1) { return this.used + n <= this.limit; }
  spend(n = 1) {
    if (!this.canSpend(n)) throw new QuotaExceededError(this.id);
    this.used += n;
    return this.used;
  }
}
export function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}
export function backoffMs(attempt: number, base = 400): number {
  const cap = 8000;
  return Math.min(cap, base * 2 ** attempt) + Math.floor(Math.random() * 120);
}
