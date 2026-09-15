export const API_PREFIX = "/api/v1";
export const SUPPORTED_IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic"];
export const SUPPORTED_VIDEO_EXT = ["mp4", "mov", "m4v"];
export type AppMode = "local" | "hybrid" | "full-ai";
export type MediaType = "image" | "video";
export interface HealthResponse {
  ok: true;
  service: "travel-reel-studio";
  mode: AppMode;
  offline: boolean;
  features: { googlePhotos: boolean; gemini: boolean; places: boolean };
}
export interface QualityWeights {
  resolution: number; sharpness: number; exposure: number; composition: number; usability: number;
}
export const DEFAULT_QUALITY_WEIGHTS: QualityWeights = {
  resolution: 0.3, sharpness: 0.3, exposure: 0.15, composition: 0.15, usability: 0.1,
};
export const TEMPLATES = [
  { id: "viral-travel", name: "Viral Travel", pacing: "fast" },
  { id: "luxury-cinematic", name: "Luxury Cinematic", pacing: "slow" },
  { id: "hotel-review", name: "Hotel Review", pacing: "medium" },
  { id: "personal-story", name: "Personal Travel Story", pacing: "narrative" },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]["id"];
export interface RenderPlan {
  canvas: { width: number; height: number; fps: number };
  duration: number;
  clips: Array<{ mediaId: string; start: number; duration: number; crop: { mode: "cover" | "contain" }; transition: "cut" | "fade" }>;
  overlays: Array<{ text: string; start: number; duration: number; position: "center" | "bottom" | "top" }>;
  audio?: { track?: string; volume: number };
}
export function resolveMode(flags: { googlePhotos: boolean; gemini: boolean; places: boolean }): AppMode {
  if (flags.googlePhotos && flags.gemini && flags.places) return "full-ai";
  if (flags.googlePhotos || flags.gemini || flags.places) return "hybrid";
  return "local";
}
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
export function combineQuality(parts: QualityWeights, weights: QualityWeights = DEFAULT_QUALITY_WEIGHTS): number {
  return clamp01(
    parts.resolution * weights.resolution +
      parts.sharpness * weights.sharpness +
      parts.exposure * weights.exposure +
      parts.composition * weights.composition +
      parts.usability * weights.usability,
  );
}
