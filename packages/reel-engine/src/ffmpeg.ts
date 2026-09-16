import type { RenderPlan } from "@trs/shared";
export interface ClipSource { mediaId: string; filePath: string; mediaType: "image" | "video"; }
function vfCover(duration: number): string {
  return [`scale=1080:1920:force_original_aspect_ratio=increase`, `crop=1080:1920`, `fps=30`, `setsar=1`, `trim=duration=${duration}`, `setpts=PTS-STARTPTS`].join(",");
}
export function buildClipArgs(source: ClipSource, duration: number, outFile: string): string[] {
  if (source.mediaType === "image") {
    return ["-y", "-loop", "1", "-t", String(duration), "-i", source.filePath, "-vf", vfCover(duration), "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", outFile];
  }
  return ["-y", "-i", source.filePath, "-t", String(duration), "-vf", vfCover(duration), "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", outFile];
}
export function buildConcatArgs(listFile: string, outFile: string, volume = 0.35): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-af", `volume=${volume}`, "-r", "30", "-movflags", "+faststart", outFile];
}
export function concatList(files: string[]): string {
  return files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
}
export function assertNoShell(args: string[]): void {
  if (/[;&|`$]/.test(args.join(" "))) throw new Error("ffmpeg argv must not contain shell metacharacters");
}
export function planClipCount(plan: RenderPlan): number {
  return plan.clips.length;
}
