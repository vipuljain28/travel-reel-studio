export interface ResolvedPlace {
  placeId: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "cache" | "places-api" | "local-fallback";
}
export interface PlaceProvider { resolve(query: string): Promise<ResolvedPlace | null>; }
export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}
