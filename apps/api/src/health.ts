import { resolveMode, type HealthResponse } from "@trs/shared";

export function buildHealth(flags: {
  googlePhotos: boolean;
  gemini: boolean;
  places: boolean;
}): HealthResponse {
  const mode = resolveMode(flags);
  return {
    ok: true,
    service: "travel-reel-studio",
    mode,
    offline: mode === "local",
    features: flags,
  };
}
