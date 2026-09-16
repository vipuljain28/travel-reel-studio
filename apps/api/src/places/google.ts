import type { PlaceProvider, ResolvedPlace } from "./types.js";
export const PLACES_FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location";
export const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
export class GooglePlaceProvider implements PlaceProvider {
  constructor(private readonly apiKey: string, private readonly fetchFn: typeof fetch = fetch) {}
  async resolve(query: string): Promise<ResolvedPlace | null> {
    const res = await this.fetchFn(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query, pageSize: 1 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      }>;
    };
    const place = data.places?.[0];
    if (!place) return null;
    return {
      placeId: place.id ?? null,
      name: place.displayName?.text || query,
      address: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      source: "places-api",
    };
  }
}
