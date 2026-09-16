import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { scoreMedia, compositionScore } from "./quality.js";
import { sha256File, simpleDHashFromBytes } from "./hash.js";
import { imageSizeFromBuffer, jpegExifDate } from "./image-headers.js";
import { extOf, mediaTypeOf, mimeOf } from "./formats.js";

export interface AnalyzedMedia {
  filePath: string;
  mediaType: "image" | "video";
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  dateTaken?: Date;
  sha256: string;
  pHash?: string;
  qualityScore: number;
  sharpnessScore: number;
  exposureScore: number;
  compositionScore: number;
  readable: boolean;
}

async function ffprobeJson(filePath: string): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const child = spawn(
      "ffprobe",
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    const chunks: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(text));
      } catch {
        resolve(null);
      }
    });
  });
}

function sampleStats(buf: Buffer): { sharpness: number; exposure: number } {
  if (buf.length < 64) return { sharpness: 0.45, exposure: 0.5 };
  let sum = 0;
  let diff = 0;
  const step = Math.max(1, Math.floor(buf.length / 2048));
  let prev = buf[0];
  let n = 0;
  for (let i = 0; i < buf.length; i += step) {
    const v = buf[i];
    sum += v;
    diff += Math.abs(v - prev);
    prev = v;
    n += 1;
  }
  const mean = sum / n / 255;
  return { sharpness: Math.min(1, diff / n / 40), exposure: 1 - Math.abs(mean - 0.5) * 2 };
}

export async function analyzeFile(
  filePath: string,
  mtime: Date,
  fileSize: number,
): Promise<AnalyzedMedia | null> {
  const ext = extOf(filePath);
  const mediaType = mediaTypeOf(ext);
  if (!mediaType) return null;
  const sha256 = await sha256File(filePath);
  const head = await fs.readFile(filePath).catch(() => null);
  if (!head) {
    return {
      filePath,
      mediaType,
      mimeType: mimeOf(ext),
      fileSize,
      dateTaken: mtime,
      sha256,
      qualityScore: 0,
      sharpnessScore: 0,
      exposureScore: 0,
      compositionScore: 0,
      readable: false,
    };
  }
  let width: number | undefined;
  let height: number | undefined;
  let duration: number | undefined;
  let dateTaken = mtime;
  let sharpness = 0.5;
  let exposure = 0.5;
  if (mediaType === "image") {
    const size = imageSizeFromBuffer(head);
    if (size) {
      width = size.width;
      height = size.height;
    }
    const exifDate = jpegExifDate(head);
    if (exifDate) dateTaken = exifDate;
    const stats = sampleStats(head);
    sharpness = stats.sharpness;
    exposure = stats.exposure;
  } else {
    const probe = await ffprobeJson(filePath);
    if (probe) {
      const streams = (probe.streams as Array<Record<string, unknown>> | undefined) ?? [];
      const video = streams.find((s) => s.codec_type === "video");
      if (video) {
        width = Number(video.width) || undefined;
        height = Number(video.height) || undefined;
        const format = probe.format as { duration?: string } | undefined;
        const dur = Number(video.duration ?? format?.duration);
        if (Number.isFinite(dur)) duration = dur;
      }
    }
  }
  return {
    filePath,
    mediaType,
    mimeType: mimeOf(ext),
    fileSize,
    width,
    height,
    duration,
    dateTaken,
    sha256,
    pHash: simpleDHashFromBytes(head.subarray(0, 4096)),
    qualityScore: scoreMedia({ width, height, sharpness, exposure, readable: true }),
    sharpnessScore: sharpness,
    exposureScore: exposure,
    compositionScore: compositionScore(width, height),
    readable: true,
  };
}
