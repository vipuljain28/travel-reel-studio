export function logEvent(event: string, extra: Record<string, unknown> = {}) {
  const safe = { ...extra };
  for (const key of Object.keys(safe)) {
    if (/token|secret|password|authorization|baseurl/i.test(key)) delete safe[key];
  }
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...safe }));
}
