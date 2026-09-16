import type { RenderPlan, TemplateId } from "@trs/shared";
import { TEMPLATE_CONFIG } from "./templates.js";
export { TEMPLATE_CONFIG } from "./templates.js";
export type { TemplateConfig } from "./templates.js";
export * from "./ffmpeg.js";
export function buildRenderPlan(input: { mediaIds: string[]; template: TemplateId; duration?: number; hook?: string; caption?: string; }): RenderPlan {
  const tpl = TEMPLATE_CONFIG[input.template] ?? TEMPLATE_CONFIG["viral-travel"];
  const ids = input.mediaIds.filter(Boolean).slice(0, 12);
  const duration = input.duration ?? Math.max(8, Math.round(Math.max(1, ids.length) * tpl.clipSeconds));
  let t = 0;
  const clips = ids.map((mediaId, i) => {
    const start = Number(t.toFixed(3));
    const last = i === ids.length - 1;
    const d = last ? Math.max(1.2, Number((duration - t).toFixed(3))) : tpl.clipSeconds;
    t += d;
    return { mediaId, start, duration: d, crop: { mode: "cover" as const }, transition: tpl.transition };
  });
  const overlays: RenderPlan["overlays"] = [];
  if (input.hook) overlays.push({ text: input.hook, start: 0, duration: Math.min(tpl.hookSeconds, duration), position: "center" });
  if (input.caption) overlays.push({ text: input.caption, start: Math.max(0, duration - 2.4), duration: Math.min(2.4, duration), position: tpl.captionPosition });
  return { version: 1, canvas: { width: 1080, height: 1920, fps: 30 }, duration, clips, overlays, audio: { volume: tpl.audioVolume } };
}
export function validateRenderPlan(plan: RenderPlan): string[] {
  const errors: string[] = [];
  if (plan.canvas.width !== 1080 || plan.canvas.height !== 1920) errors.push("canvas must be 1080x1920");
  if (plan.canvas.fps !== 30) errors.push("fps must be 30");
  if (!(plan.duration > 0)) errors.push("duration must be positive");
  if (!plan.clips.length) errors.push("plan needs at least one clip");
  let prevEnd = 0;
  for (const clip of plan.clips) {
    if (!clip.mediaId) errors.push("clip missing mediaId");
    if (!(clip.duration > 0)) errors.push(`bad duration for ${clip.mediaId}`);
    if (clip.start < 0) errors.push(`negative start for ${clip.mediaId}`);
    if (clip.start + clip.duration > plan.duration + 0.05) errors.push(`clip ${clip.mediaId} exceeds timeline`);
    if (clip.start + 0.01 < prevEnd) errors.push(`clip overlap at ${clip.mediaId}`);
    prevEnd = clip.start + clip.duration;
  }
  for (const overlay of plan.overlays) {
    if (!overlay.text) errors.push("empty overlay text");
    if (overlay.start + overlay.duration > plan.duration + 0.05) errors.push("overlay exceeds timeline");
  }
  return errors;
}
