import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { Budget, QuotaExceededError } from "../quota.js";
import { logEvent } from "../logger.js";
import { LocalPlaceProvider } from "./local.js";
import { GooglePlaceProvider } from "./google.js";
import { normalizeQuery, type PlaceProvider, type ResolvedPlace } from "./types.js";
const local = new LocalPlaceProvider();
export function placesProvider(): PlaceProvider {
  if (config.places && process.env.GOOGLE_PLACES_API_KEY) {
    return new GooglePlaceProvider(process.env.GOOGLE_PLACES_API_KEY);
  }
  return local;
}
export async function resolvePlace(rawQuery: string, budget = new Budget("places", config.placesBudget)): Promise<ResolvedPlace | null> {
  const query = normalizeQuery(rawQuery);
  if (!query) return null;
  const cached = await prisma.placeCache.findUnique({ where: { query } });
  if (cached) {
    return {
      placeId: cached.placeId,
      name: cached.name || rawQuery,
      address: cached.address,
      latitude: cached.latitude,
      longitude: cached.longitude,
      source: "cache",
    };
  }
  const provider = placesProvider();
  const usesNetwork = provider instanceof GooglePlaceProvider;
  if (usesNetwork) {
    if (!budget.canSpend(1)) throw new QuotaExceededError("places");
    budget.spend(1);
  }
  const resolved = (await provider.resolve(rawQuery)) ?? (await local.resolve(rawQuery));
  if (!resolved) return null;
  await prisma.placeCache.upsert({
    where: { query },
    create: { query, placeId: resolved.placeId, name: resolved.name, address: resolved.address, latitude: resolved.latitude, longitude: resolved.longitude },
    update: { placeId: resolved.placeId, name: resolved.name, address: resolved.address, latitude: resolved.latitude, longitude: resolved.longitude },
  });
  logEvent("place_resolve", { query, source: resolved.source, network: usesNetwork });
  return resolved;
}
