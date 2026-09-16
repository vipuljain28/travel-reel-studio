export interface SearchableMedia {
  filePath?: string | null;
  locationName?: string | null;
  tripTitle?: string | null;
  dateTaken?: Date | null;
  qualityScore?: number | null;
  aiDescription?: string | null;
  mediaType?: string | null;
}
export interface ParsedQuery {
  textTokens: string[];
  trip?: string;
  location?: string;
  qualityMin?: number;
  mediaType?: "image" | "video";
  year?: number;
  month?: number;
}
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function parseSearchQuery(q: string): ParsedQuery {
  let rest = q.trim();
  const parsed: ParsedQuery = { textTokens: [] };
  const trip = rest.match(/\btrip:([^\s]+)/i);
  if (trip) { parsed.trip = trip[1].replace(/[_-]/g, " "); rest = rest.replace(trip[0], " "); }
  const loc = rest.match(/\blocation:([^\s]+)/i);
  if (loc) { parsed.location = loc[1].replace(/[_-]/g, " "); rest = rest.replace(loc[0], " "); }
  const quality = rest.match(/\bquality:>([0-9.]+)/i);
  if (quality) { parsed.qualityMin = Number(quality[1]); rest = rest.replace(quality[0], " "); }
  const type = rest.match(/\btype:(image|video)/i);
  if (type) { parsed.mediaType = type[1].toLowerCase() as "image" | "video"; rest = rest.replace(type[0], " "); }
  const isoMonth = rest.match(/\b(20\d{2})-(\d{2})\b/);
  if (isoMonth) { parsed.year = Number(isoMonth[1]); parsed.month = Number(isoMonth[2]); rest = rest.replace(isoMonth[0], " "); }
  const monthYear = rest.match(/\b([A-Za-z]+)\s+(20\d{2})\b/);
  if (monthYear && MONTHS[monthYear[1].toLowerCase()]) {
    parsed.month = MONTHS[monthYear[1].toLowerCase()];
    parsed.year = Number(monthYear[2]);
    rest = rest.replace(monthYear[0], " ");
  } else {
    const yearOnly = rest.match(/\b(20\d{2})\b/);
    if (yearOnly) { parsed.year = Number(yearOnly[1]); rest = rest.replace(yearOnly[0], " "); }
  }
  parsed.textTokens = tokenize(rest);
  return parsed;
}
export function inferPlaceFromPath(filePath?: string | null): string | null {
  if (!filePath) return null;
  const parts = filePath.split(/[/\\]/).filter(Boolean);
  if (parts.length < 2) return null;
  const folder = parts[parts.length - 2];
  if (/^(media|dcim|camera|img|images|photos|video)$/i.test(folder)) return null;
  return folder.replace(/[_-]+/g, " ");
}
export function matchesSearch(item: SearchableMedia, rawQuery: string): boolean {
  const q = parseSearchQuery(rawQuery);
  if (q.qualityMin != null && (item.qualityScore ?? 0) < q.qualityMin) return false;
  if (q.mediaType && item.mediaType && item.mediaType !== q.mediaType) return false;
  if (q.trip && !(item.tripTitle || "").toLowerCase().includes(q.trip.toLowerCase())) return false;
  const locHay = `${item.locationName ?? ""} ${inferPlaceFromPath(item.filePath) ?? ""}`.toLowerCase();
  if (q.location && !locHay.includes(q.location.toLowerCase())) return false;
  if (q.year && item.dateTaken && item.dateTaken.getUTCFullYear() !== q.year) return false;
  if (q.month && item.dateTaken && item.dateTaken.getUTCMonth() + 1 !== q.month) return false;
  if (!q.textTokens.length) return true;
  const hay = [
    item.filePath,
    item.locationName,
    item.tripTitle,
    item.aiDescription,
    inferPlaceFromPath(item.filePath),
    item.dateTaken?.toISOString(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hayNorm = hay.replace(/[^a-z0-9]+/g, " ");
  return q.textTokens.every((token) => hay.includes(token) || hayNorm.includes(token));
}
