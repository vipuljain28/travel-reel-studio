import express from "express";
import cors from "cors";
import { API_PREFIX, TEMPLATES } from "@trs/shared";
import { matchesSearch } from "@trs/media-analyzer";
import { buildRenderPlan, validateRenderPlan } from "@trs/reel-engine";
import { getAiProvider } from "@trs/ai-director";
import type { TemplateId } from "@trs/shared";
import { config, mode } from "./config.js";
import { prisma } from "./prisma.js";
import { scanMediaRoot } from "./scanner.js";
import { snapshot } from "./usage.js";
import { logEvent } from "./logger.js";
import { buildHealth } from "./health.js";
import { detectAndPersistTrips } from "./trips-service.js";
import { authorizationUrl, photosConfigured, exchangeCode, photosConnected } from "./photos/oauth.js";
import { HttpPhotosClient } from "./photos/http-client.js";
import { syncGooglePhotos } from "./photos/sync.js";
import { resolvePlace } from "./places/service.js";
import { renderJob } from "./renderer.js";
import { rateLimitMiddleware } from "./rate-limit.js";

const app = express();
app.use(cors({ origin: config.webOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(rateLimitMiddleware(120) as express.RequestHandler);
const v1 = express.Router();

v1.get("/health", (_req, res) => {
  res.json(buildHealth({ googlePhotos: config.googlePhotos, gemini: config.gemini, places: config.places }));
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
    matchesSearch({
      filePath: m.filePath,
      locationName: m.locationName,
      tripTitle: m.tripId ? tripMap.get(m.tripId) : null,
      dateTaken: m.dateTaken,
      qualityScore: m.qualityScore,
      aiDescription: m.aiDescription,
      mediaType: m.mediaType,
    }, q),
  );
  res.json({ query: q, items: matched });
});
v1.get("/media/duplicates", async (_req, res) => {
  res.json({ items: await prisma.media.findMany({ where: { duplicateGroupId: { not: null } } }) });
});
v1.get("/media/:id", async (req, res) => {
  const item = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item);
});
v1.post("/trips/detect", async (req, res) => {
  const replace = String(req.query.replace ?? "true") !== "false";
  res.json({ trips: await detectAndPersistTrips(replace) });
});
v1.get("/trips", async (_req, res) => {
  res.json({ items: await prisma.trip.findMany({ include: { media: true } }) });
});
v1.get("/trips/:id", async (req, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id }, include: { media: true } });
  if (!trip) return res.status(404).json({ error: "not found" });
  res.json(trip);
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
    caption: project.caption || undefined,
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
  if (!project.renderPlan) return res.status(400).json({ error: "render_plan_missing" });
  const job = await prisma.renderJob.create({ data: { projectId, status: "QUEUED" } });
  renderJob(job.id).catch(() => undefined);
  res.status(202).json({ job });
});
v1.get("/render/:id", async (req, res) => {
  const job = await prisma.renderJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});
v1.get("/integrations/google-photos", async (_req, res) => {
  const sync = await prisma.syncState.findUnique({ where: { provider: "google-photos" } });
  const connected = await photosConnected();
  res.json({
    enabledFlag: config.googlePhotos,
    configured: photosConfigured(),
    connected,
    status: connected ? sync?.status || "connected" : photosConfigured() ? "configured" : "disconnected",
    lastSync: sync?.lastSync ?? null,
    itemsProcessed: sync?.itemsProcessed ?? 0,
    errors: sync?.errors ?? null,
    note: "photoslibrary.readonly only. Media IDs cached; temporary base URLs are never stored.",
  });
});
v1.get("/integrations/google-photos/connect", (_req, res) => {
  if (!photosConfigured()) return res.status(400).json({ error: "google_photos_disabled" });
  res.json({ authorizationUrl: authorizationUrl("trs") });
});
v1.get("/integrations/google-photos/callback", async (req, res) => {
  const err = String(req.query.error || "");
  const code = String(req.query.code || "");
  const web = config.webOrigin.replace(/\/$/, "");
  if (err || !code) {
    return res.redirect(`${web}/settings?photos=error`);
  }
  try {
    await exchangeCode(code);
    return res.redirect(`${web}/settings?photos=connected`);
  } catch (e) {
    logEvent("photos_oauth_failed", { message: e instanceof Error ? e.message : "oauth_failed" });
    return res.redirect(`${web}/settings?photos=error`);
  }
});
v1.post("/integrations/google-photos/disconnect", async (_req, res) => {
  await prisma.integrationCredential.deleteMany({ where: { provider: "google-photos" } });
  await prisma.syncState.deleteMany({ where: { provider: "google-photos" } });
  res.json({ status: "disconnected" });
});
v1.post("/integrations/google-photos/sync", async (_req, res) => {
  if (!photosConfigured()) return res.status(400).json({ error: "google_photos_disabled" });
  if (!(await photosConnected())) return res.status(400).json({ error: "photos_not_connected" });
  try {
    const result = await syncGooglePhotos(new HttpPhotosClient());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "sync_failed" });
  }
});
v1.get("/integrations/gemini", (_req, res) => {
  res.json({ configured: config.gemini, status: config.gemini ? "configured" : "not_configured" });
});
v1.get("/integrations/places", (_req, res) => {
  res.json({
    configured: config.places && Boolean(process.env.GOOGLE_PLACES_API_KEY),
    status: config.places ? "configured" : "local-fallback",
    fieldMask: "places.id,places.displayName,places.formattedAddress,places.location",
  });
});
v1.post("/places/resolve", async (req, res) => {
  const query = String(req.body.query || req.body.q || "");
  res.json({ query, place: await resolvePlace(query) });
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
  logEvent("api_listen", { port: config.port, mode: mode(), mediaRoot: config.mediaRoot });
});
