import { combineQuality, clamp01, type QualityWeights } from "@trs/shared";
export function resolutionScore(width?: number | null, height?: number | null): number {
  const pixels = (width ?? 0) * (height ?? 0);
  if (pixels <= 0) return 0;
  return clamp01(pixels / (1920 * 1080));
}
export function compositionScore(width?: number | null, height?: number | null): number {
  if (!width || !height) return 0.4;
  const ratio = width / height;
  const best = Math.min(Math.abs(ratio - 9 / 16), Math.abs(ratio - 16 / 9));
  return clamp01(1 - best);
}
export function usabilityScore(readable: boolean): number { return readable ? 1 : 0; }
export function scoreMedia(input: { width?: number | null; height?: number | null; sharpness?: number; exposure?: number; readable?: boolean; weights?: QualityWeights; }): number {
  const parts = {
    resolution: resolutionScore(input.width, input.height),
    sharpness: input.sharpness ?? 0.5,
    exposure: input.exposure ?? 0.5,
    composition: compositionScore(input.width, input.height),
    usability: usabilityScore(input.readable ?? true),
  };
  return combineQuality(parts, input.weights);
}
