import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { resolveMode, type AppMode } from "@trs/shared";

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const pkg = path.join(dir, "package.json");
    try {
      const json = JSON.parse(fs.readFileSync(pkg, "utf8")) as { name?: string; workspaces?: unknown };
      if (json.name === "travel-reel-studio" || json.workspaces) return dir;
    } catch {
      /* keep walking */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start, "../../..");
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = findRepoRoot(here);

dotenv.config({ path: path.join(repoRoot, ".env") });

function resolveDir(value: string | undefined, fallback: string): string {
  const raw = value && value.trim() ? value : fallback;
  if (path.isAbsolute(raw)) return path.resolve(raw);
  return path.resolve(repoRoot, raw);
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
