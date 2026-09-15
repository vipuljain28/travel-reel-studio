import type { RenderPlan, TemplateId } from "@trs/shared";
const PACE: Record<TemplateId, number> = {
  "viral-travel": 1.8,
  "luxury-cinematic": 3.6,
  "hotel-review": 2.6,
  "personal-story": 2.8,
};
export function buildRenderPlan(input: { mediaIds: string[]; template: TemplateId; duration?: number; hook?: string; }): RenderPlan {
  const clipLen = PACE[input.template] ?? 2.4;
  const ids = input.mediaIds.slice(0, 12);
  const duration = input.duration ?? Math.max(8, Math.round(ids.length * clipLen));
  let t = 0;
  const clips = ids.map((mediaId, i) => {
    const start = t;
    const d = i === ids.length - 1 ? Math.max(1.2, duration - t) : clipLen;
    t += d;
    return { mediaId, start, duration: d, crop: { mode: "cover" as const }, transition: (input.template === "luxury-cinematic" ? "fade" : "cut") as "fade" | "cut" };
  });
  return {
    canvas: { width: 1080, height: 1920, fps: 30 },
    duration,
    clips,
    overlays: input.hook ? [{ text: input.hook, start: 0, duration: Math.min(2.5, duration), position: "center" }] : [],
    audio: { volume: 0.35 },
  };
}
export function validateRenderPlan(plan: RenderPlan): string[] {
  const errors: string[] = [];
  if (plan.canvas.width !== 1080 || plan.canvas.height !== 1920) errors.push("canvas must be 1080x1920");
  if (plan.duration <= 0) errors.push("duration must be positive");
  for (const clip of plan.clips) {
    if (!clip.mediaId) errors.push("clip missing mediaId");
    if (clip.duration <= 0) errors.push(`bad duration for ${clip.mediaId}`);
  }
  return errors;
}
