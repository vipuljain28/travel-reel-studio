import { SUPPORTED_IMAGE_EXT, SUPPORTED_VIDEO_EXT } from "@trs/shared";

export function extOf(filePath: string): string {
  const i = filePath.lastIndexOf(".");
  return i >= 0 ? filePath.slice(i + 1).toLowerCase() : "";
}
export function isSupportedImage(ext: string): boolean {
  return (SUPPORTED_IMAGE_EXT as readonly string[]).includes(ext);
}
export function isSupportedVideo(ext: string): boolean {
  return (SUPPORTED_VIDEO_EXT as readonly string[]).includes(ext);
}
export function mediaTypeOf(ext: string): "image" | "video" | null {
  if (isSupportedImage(ext)) return "image";
  if (isSupportedVideo(ext)) return "video";
  return null;
}
export function mimeOf(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/x-m4v";
  return "application/octet-stream";
}
