import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { resolveMode, type AppMode } from "@trs/shared";

const here = path.dirname(fileURLToPath(import.meta.url));
/** apps/api/src → repo root */
export const repoRoot = path.resolve(here, "../../..");

dotenv.config({ path: path.join(repoRoot, ".env") });

function resolveDir(value: string | undefined, fallback: string): string {
  const raw = value && value.trim() ? value : fallback;
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(repoRoot, raw);
}

export const config = {
  port: Number(process.env.PORT || 4000),
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:5173",
  mediaRoot: resolveDir(process.env.MEDIA_ROOT, "media"),
  outputRoot: resolveDir(process.env.OUTPUT_ROOT, "output"),
  tempRoot: resolveDir(process.env.TEMP_ROOT, "temp"),
  googlePhotos: process.env.GOOGLE_PHOTOS_ENABLED === "true",
  gemini: process.env.GEMINI_ENABLED === "true",
  places: process.env.PLACES_ENABLED === "true",
  photosBudget: Number(process.env.GOOGLE_PHOTOS_DAILY_REQUEST_BUDGET || 8000),
  photosByteBudget: Number(process.env.GOOGLE_PHOTOS_MEDIA_BYTE_DAILY_BUDGET || 60000),
  aiRpm: Number(process.env.AI_RPM_LIMIT || 5),
  aiRpd: Number(process.env.AI_RPD_LIMIT || 100),
  placesBudget: Number(process.env.PLACES_DAILY_REQUEST_BUDGET || 100),
};

export function mode(): AppMode {
  return resolveMode({
    googlePhotos: config.googlePhotos,
    gemini: config.gemini,
    places: config.places,
  });
}
