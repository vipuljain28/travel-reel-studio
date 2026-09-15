import { promises as fs } from "node:fs";
import path from "node:path";
import { SUPPORTED_IMAGE_EXT, SUPPORTED_VIDEO_EXT } from "@trs/shared";
import { scoreMedia, sha256File } from "@trs/media-analyzer";
import { prisma } from "./prisma.js";
import { config } from "./config.js";
import { logEvent } from "./logger.js";

const EXTS = new Set([...SUPPORTED_IMAGE_EXT, ...SUPPORTED_VIDEO_EXT]);

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else {
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (EXTS.has(ext)) acc.push(full);
    }
  }
  return acc;
}

export async function scanMediaRoot(): Promise<{ scanned: number; upserted: number }> {
  const root = path.resolve(config.mediaRoot);
  await fs.mkdir(root, { recursive: true });
  const files = await walk(root);
  let upserted = 0;
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mediaType = SUPPORTED_VIDEO_EXT.includes(ext) ? "video" : "image";
    const hash = await sha256File(filePath);
    const qualityScore = scoreMedia({
      width: 1920,
      height: 1080,
      sharpness: 0.6,
      exposure: 0.6,
      readable: true,
    });
    await prisma.media.upsert({
      where: { provider_filePath: { provider: "local", filePath } },
      create: {
        provider: "local",
        filePath,
        mediaType,
        mimeType: mediaType === "video" ? `video/${ext}` : `image/${ext}`,
        fileSize: stat.size,
        sha256: hash,
        qualityScore,
        dateTaken: stat.mtime,
      },
      update: { fileSize: stat.size, sha256: hash, qualityScore },
    });
    upserted += 1;
  }
  const hashes = await prisma.media.groupBy({
    by: ["sha256"],
    where: { sha256: { not: null } },
    _count: { sha256: true },
  });
  for (const g of hashes) {
    if (!g.sha256 || g._count.sha256 < 2) continue;
    await prisma.media.updateMany({
      where: { sha256: g.sha256 },
      data: { duplicateGroupId: g.sha256 },
    });
  }
  logEvent("media_scan", { scanned: files.length, upserted });
  return { scanned: files.length, upserted };
}
