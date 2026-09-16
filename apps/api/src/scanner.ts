import { promises as fs } from "node:fs";
import path from "node:path";
import { analyzeFile, walkMediaFiles, inferPlaceFromPath } from "@trs/media-analyzer";
import { prisma } from "./prisma.js";
import { config } from "./config.js";
import { logEvent } from "./logger.js";
import { assertInsideRoot } from "./path-safety.js";

async function writeThumbPointer(sha256: string, filePath: string): Promise<string> {
  const dir = path.resolve(config.tempRoot, "thumbs");
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${sha256}.src.txt`);
  await fs.writeFile(dest, filePath, "utf8");
  return dest;
}

export async function scanMediaRoot(): Promise<{
  root: string;
  scanned: number;
  upserted: number;
  skipped: number;
  backfilled: number;
  duplicates: number;
}> {
  const root = path.resolve(config.mediaRoot);
  await fs.mkdir(root, { recursive: true });
  const files = await walkMediaFiles(root);
  let upserted = 0;
  let skipped = 0;
  let backfilled = 0;
  for (const filePath of files) {
    assertInsideRoot(root, path.relative(root, filePath));
    const stat = await fs.stat(filePath);
    const existing = await prisma.media.findUnique({
      where: { provider_filePath: { provider: "local", filePath } },
    });
    const place = inferPlaceFromPath(filePath);
    const analyzed = await analyzeFile(filePath, stat.mtime, stat.size);
    if (!analyzed) {
      skipped += 1;
      continue;
    }
    if (existing?.sha256 === analyzed.sha256 && existing.fileSize === stat.size) {
      if (!existing.locationName && place) {
        await prisma.media.update({ where: { id: existing.id }, data: { locationName: place } });
        backfilled += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    const thumbnailPath = await writeThumbPointer(analyzed.sha256, filePath);
    const payload = {
      mediaType: analyzed.mediaType,
      mimeType: analyzed.mimeType,
      fileSize: analyzed.fileSize,
      width: analyzed.width ?? null,
      height: analyzed.height ?? null,
      duration: analyzed.duration ?? null,
      dateTaken: analyzed.dateTaken ?? stat.mtime,
      locationName: place,
      sha256: analyzed.sha256,
      pHash: analyzed.pHash ?? null,
      thumbnailPath,
      qualityScore: analyzed.qualityScore,
      sharpnessScore: analyzed.sharpnessScore,
      exposureScore: analyzed.exposureScore,
      compositionScore: analyzed.compositionScore,
    };
    await prisma.media.upsert({
      where: { provider_filePath: { provider: "local", filePath } },
      create: { provider: "local", filePath, ...payload },
      update: payload,
    });
    upserted += 1;
  }
  const hashes = await prisma.media.groupBy({
    by: ["sha256"],
    where: { sha256: { not: null } },
    _count: { sha256: true },
  });
  let duplicates = 0;
  for (const g of hashes) {
    if (!g.sha256 || g._count.sha256 < 2) continue;
    duplicates += g._count.sha256;
    await prisma.media.updateMany({ where: { sha256: g.sha256 }, data: { duplicateGroupId: g.sha256 } });
  }
  logEvent("media_scan", { root, scanned: files.length, upserted, skipped, backfilled, duplicates });
  return { root, scanned: files.length, upserted, skipped, backfilled, duplicates };
}
