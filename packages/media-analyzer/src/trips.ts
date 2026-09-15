export interface GeoPoint { dateTaken: Date; latitude?: number | null; longitude?: number | null; locationName?: string | null; }
export interface DetectedTrip { title: string; startDate: Date; endDate: Date; mediaIndexes: number[]; }
function haversineKm(a: GeoPoint, b: GeoPoint): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function detectTrips(points: GeoPoint[], gapHours = 36): DetectedTrip[] {
  if (points.length === 0) return [];
  const indexed = points.map((p, i) => ({ p, i })).filter((x) => x.p.dateTaken).sort((a, b) => a.p.dateTaken.getTime() - b.p.dateTaken.getTime());
  const groups: number[][] = [];
  let current: number[] = [];
  let last: GeoPoint | null = null;
  for (const { p, i } of indexed) {
    if (!last) { current = [i]; last = p; continue; }
    const hours = (p.dateTaken.getTime() - last.dateTaken.getTime()) / 36e5;
    const dist = haversineKm(last, p);
    const far = dist != null && dist > 120;
    if (hours > gapHours || far) { groups.push(current); current = [i]; } else { current.push(i); }
    last = p;
  }
  if (current.length) groups.push(current);
  return groups.map((mediaIndexes) => {
    const dates = mediaIndexes.map((i) => points[i].dateTaken);
    const names = mediaIndexes.map((i) => points[i].locationName).filter((n): n is string => Boolean(n));
    return { title: names[0] ? `${names[0]} trip` : "Untitled trip", startDate: new Date(Math.min(...dates.map((d) => d.getTime()))), endDate: new Date(Math.max(...dates.map((d) => d.getTime()))), mediaIndexes };
  });
}
