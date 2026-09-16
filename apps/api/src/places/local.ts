import type { PlaceProvider, ResolvedPlace } from "./types.js";
export class LocalPlaceProvider implements PlaceProvider {
  async resolve(query: string): Promise<ResolvedPlace | null> {
    const cleaned = query.trim();
    if (!cleaned) return null;
    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    return {
      placeId: null,
      name: parts[0],
      address: parts.slice(1).join(", ") || null,
      latitude: null,
      longitude: null,
      source: "local-fallback",
    };
  }
}
