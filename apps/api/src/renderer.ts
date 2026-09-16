import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { RenderPlan } from "@trs/shared";
import { buildClipArgs, buildConcatArgs, concatList, assertNoShell, validateRenderPlan } from "@trs/reel-engine";
import { prisma } from "./prisma.js";
import { config } from "./config.js";
import { assertInsideRoot } from "./path-safety.js";
import { logEvent } from "./logger.js";
function runFfmpeg(args: string[]): Promise<void> {
  assertNoShell(args);
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    const err: Buffer[] = [];
    child.stderr.on("data", (c) => err.push(c));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(Buffer.concat(err).toString("utf8").slice(-400) || `ffmpeg ${code}`));
    });
  });
}
export async function renderJob(jobId: string): Promise<void> {
  const job = await prisma.renderJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("job not found");
  const project = await prisma.project.findUnique({ where: { id: job.projectId } });
  if (!project?.renderPlan) throw new Error("render plan missing — call GET /projects/:id/render-plan first");
  const plan = JSON.parse(project.renderPlan) as RenderPlan;
  const errors = validateRenderPlan(plan);
  if (errors.length) throw new Error(errors.join("; "));
  await prisma.renderJob.update({ where: { id: jobId }, data: { status: "RENDERING", startedAt: new Date(), progress: 5 } });
  const work = path.resolve(config.tempRoot, jobId);
  const outDir = path.resolve(config.outputRoot);
  await fs.mkdir(work, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });
  const segments: string[] = [];
  try {
    for (let i = 0; i < plan.clips.length; i++) {
      const clip = plan.clips[i];
      const media = await prisma.media.findUnique({ where: { id: clip.mediaId } });
      if (!media?.filePath) throw new Error(`media ${clip.mediaId} has no local file`);
      if (media.provider !== "local") throw new Error(`media ${clip.mediaId} is not a local file`);
      const root = path.resolve(config.mediaRoot);
      const src = assertInsideRoot(root, path.relative(root, path.resolve(media.filePath)));
      const seg = path.join(work, `clip-${i}.mp4`);
      await runFfmpeg(buildClipArgs({ mediaId: clip.mediaId, filePath: src, mediaType: media.mediaType === "video" ? "video" : "image" }, clip.duration, seg));
      segments.push(seg);
      await prisma.renderJob.update({ where: { id: jobId }, data: { progress: 10 + Math.round(((i + 1) / plan.clips.length) * 70) } });
    }
    const listFile = path.join(work, "concat.txt");
    await fs.writeFile(listFile, concatList(segments), "utf8");
    const outputPath = path.join(outDir, `${jobId}.mp4`);
    await runFfmpeg(buildConcatArgs(listFile, outputPath, plan.audio?.volume ?? 0.35));
    await prisma.renderJob.update({ where: { id: jobId }, data: { status: "COMPLETED", progress: 100, outputPath, completedAt: new Date() } });
    logEvent("render_complete", { jobId, outputPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : "render_failed";
    await prisma.renderJob.update({ where: { id: jobId }, data: { status: "FAILED", error: message.slice(0, 500) } });
    logEvent("render_failed", { jobId, error: message });
    throw err;
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
