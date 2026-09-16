export function publicReason(input: string): string {
  return input.replace(/[^a-zA-Z0-9._\- ]+/g, "_").slice(0, 160);
}

export function logPhotosError(where: string, err: unknown, extra: Record<string, unknown> = {}) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[photos] ${where}:`, message, extra);
}
