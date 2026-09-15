export interface SearchableMedia { filePath?: string | null; locationName?: string | null; tripTitle?: string | null; dateTaken?: Date | null; qualityScore?: number | null; aiDescription?: string | null; }
export function parseSearchQuery(q: string): { text: string; qualityMin?: number } {
  const quality = q.match(/quality:>([0-9.]+)/i);
  const text = q.replace(/quality:>([0-9.]+)/i, "").replace(/trip:|location:/gi, "").trim();
  return { text, qualityMin: quality ? Number(quality[1]) : undefined };
}
export function matchesSearch(item: SearchableMedia, rawQuery: string): boolean {
  const { text, qualityMin } = parseSearchQuery(rawQuery);
  if (qualityMin != null && (item.qualityScore ?? 0) < qualityMin) return false;
  if (!text) return true;
  const hay = [item.filePath, item.locationName, item.tripTitle, item.aiDescription, item.dateTaken?.toISOString()].filter(Boolean).join(" ").toLowerCase();
  return text.toLowerCase().split(/\s+/).every((token) => hay.includes(token));
}
