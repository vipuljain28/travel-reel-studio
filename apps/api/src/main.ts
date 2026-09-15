import express from "express";
import cors from "cors";
import { API_PREFIX, TEMPLATES } from "@trs/shared";
import { matchesSearch, detectTrips } from "@trs/media-analyzer";
import { buildRenderPlan, validateRenderPlan } from "@trs/reel-engine";
import { getAiProvider } from "@trs/ai-director";
import type { TemplateId } from "@trs/shared";
import { config, mode } from "./config.js";
import { prisma } from "./prisma.js";
import { scanMediaRoot } from "./scanner.js";
import { snapshot } from "./usage.js";
import { logEvent } from "./logger.js";

const app = express();
app.use(cors({ origin: config.webOrigin }));
app.use(express.json({ limit: "2mb" }));

const v1 = express.Router();

v1.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "travel-reel-studio",
    mode: mode(),
    offline: !config.googlePhotos && !config.gemini && !config.places,
    features: { googlePhotos: config.googlePhotos, gemini: config.gemini, places: config.places },
  });
});

v1.post("/media/scan", async (_req, res) => {
  res.json(await scanMediaRoot());
});

v1.get("/media", async (_req, res) => {
  res.json({ items: await prisma.media.findMany({ orderBy: { dateTaken: "desc" } }) });
});

v1.get("/media/search", async (req, res) => {
  const q = String(req.query.q || "");
  const items = await prisma.media.findMany();
  const trips = await prisma.trip.findMany();
  const tripMap = new Map(trips.map((t) => [t.id, t.title]));
  const matched = items.filter((m) =>
    matchesSearch(
      {
        filePath: m.filePath,
        locationName: m.locationName,
        tripTitle: m.tripId ? tripMap.get(m.tripId) : null,
        dateTaken: m.dateTaken,
        qualityScore: m.qualityScore,
        aiDescription: m.aiDescription,
      },
      q,
    ),
  );
  res.json({ query: q, items: matched });
});

v1.get("/media/duplicates", async (_req, res) => {
  res.json({ items: await prisma.media.findMany({ where: { duplicateGroupId: { not: null } } }) });
});

v1.post("/trips/detect", async (_req, res) => {
  const media = await prisma.media.findMany();
  const detected = detectTrips(
    media.map((m) => ({
      dateTaken: m.dateTaken ?? m.createdAt,
      latitude: m.latitude,
      longitude: m.longitude,
      locationName: m.locationName,
    })),
  );
  const created = [];
  for (const trip of detected) {
    const row = await prisma.trip.create({
      data: { title: trip.title, startDate: trip.startDate, endDate: trip.endDate, placeName: trip.title },
    });
    for (const idx of trip.mediaIndexes) {
      await prisma.media.update({ where: { id: media[idx].id }, data: { tripId: row.id } });
    }
    created.push(row);
  }
  res.json({ trips: created });
});

v1.get("/trips", async (_req, res) => {
  res.json({ items: await prisma.trip.findMany({ include: { media: true } }) });
});

v1.get("/templates", (_req, res) => {
  res.json({ items: TEMPLATES });
});

v1.post("/projects", async (req, res) => {
  const project = await prisma.project.create({
    data: {
      title: String(req.body.title || "Untitled Reel"),
      destination: req.body.destination ? String(req.body.destination) : null,
      templateId: String(req.body.templateId || "viral-travel"),
    },
  });
  res.status(201).json(project);
});

v1.get("/projects", async (_req, res) => {
  res.json({ items: await prisma.project.findMany({ orderBy: { createdAt: "desc" } }) });
});

v1.get("/projects/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "not found" });
  res.json(project);
});

v1.patch("/projects/:id", async (req, res) => {
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title,
      destination: req.body.destination,
      templateId: req.body.templateId,
      duration: req.body.duration,
      hook: req.body.hook,
      caption: req.body.caption,
      mediaIds: req.body.mediaIds ? JSON.stringify(req.body.mediaIds) : undefined,
    },
  });
  res.json(project);
});

v1.post("/projects/:id/storyboard", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "not found" });
  const ids: string[] = req.body.mediaIds || JSON.parse(project.mediaIds || "[]");
  const assets = await prisma.media.findMany({
    where: ids.length ? { id: { in: ids } } : undefined,
    orderBy: { qualityScore: "desc" },
    take: 20,
  });
  const ai = getAiProvider(config.gemini);
  const storyboard = await ai.createStoryboard({
    assets: assets.map((a) => ({ mediaId: a.id, qualityScore: a.qualityScore ?? 0.5, locationName: a.locationName })),
    destination: project.destination || undefined,
    template: project.templateId,
    duration: project.duration,
  });
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      storyboard: JSON.stringify(storyboard),
      hook: storyboard.hook,
      caption: storyboard.caption,
      mediaIds: JSON.stringify(storyboard.selectedAssets.map((a) => a.mediaId)),
    },
  });
  res.json({ project: updated, storyboard, aiMode: config.gemini ? "gemini" : "mock-local" });
});

v1.get("/projects/:id/render-plan", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "not found" });
  const mediaIds: string[] = JSON.parse(project.mediaIds || "[]");
  const plan = buildRenderPlan({
    mediaIds,
    template: project.templateId as TemplateId,
    duration: project.duration,
    hook: project.hook || undefined,
  });
  const errors = validateRenderPlan(plan);
  if (errors.length) return res.status(400).json({ errors });
  await prisma.project.update({ where: { id: project.id }, data: { renderPlan: JSON.stringify(plan) } });
  res.json(plan);
});

v1.post("/render", async (req, res) => {
  const projectId = String(req.body.projectId || "");
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: "not found" });
  const job = await prisma.renderJob.create({ data: { projectId, status: "QUEUED" } });
  res.status(202).json({
    job,
    message: "Job queued. FFmpeg encode lands in Phase 8; render plan is already stored on the project.",
  });
});

v1.get("/render/:id", async (req, res) => {
  const job = await prisma.renderJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});

v1.get("/integrations/google-photos", (_req, res) => {
  res.json({
    configured: config.googlePhotos,
    status: config.googlePhotos ? "configured" : "disconnected",
    note: "OAuth connect is Phase 4. App works in local mode without it.",
  });
});

v1.get("/integrations/gemini", (_req, res) => {
  res.json({ configured: config.gemini, status: config.gemini ? "configured" : "not_configured" });
});

v1.get("/integrations/places", (_req, res) => {
  res.json({ configured: config.places, status: config.places ? "configured" : "not_configured" });
});

v1.get("/usage", async (_req, res) => {
  res.json(await snapshot());
});

app.use(API_PREFIX, v1);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logEvent("unhandled_error", { message: err.message });
  res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  logEvent("api_listen", { port: config.port, mode: mode() });
});
