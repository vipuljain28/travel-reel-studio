import type { Router } from "express";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { logEvent } from "../logger.js";
import { authorizationUrl, photosConfigured, exchangeCode, photosConnected, disconnectPhotos } from "./oauth.js";
import { HttpPhotosClient } from "./http-client.js";
import { syncGooglePhotos } from "./sync.js";
import { logPhotosError, publicReason } from "./errors.js";

export function registerPhotosRoutes(v1: Router) {
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
    if (!photosConfigured()) {
      console.error("[photos] connect blocked: google_photos_disabled (check ENABLED + CLIENT_ID + SECRET)");
      return res.status(400).json({ error: "google_photos_disabled" });
    }
    const authorization = authorizationUrl("trs");
    console.log("[photos] open this Google login URL:\n" + authorization);
    res.json({ authorizationUrl: authorization });
  });

  v1.get("/integrations/google-photos/callback", async (req, res) => {
    const googleError = String(req.query.error || "");
    const googleDesc = String(req.query.error_description || "");
    const code = String(req.query.code || "");
    const web = config.webOrigin.replace(/\/$/, "");
    console.log("[photos] callback query", {
      error: googleError || null,
      error_description: googleDesc || null,
      hasCode: Boolean(code),
    });
    if (googleError || !code) {
      const reason = publicReason(googleError || googleDesc || "missing_code");
      console.error("[photos] callback aborted:", reason);
      return res.redirect(`${web}/settings?photos=error&reason=${encodeURIComponent(reason)}`);
    }
    try {
      await exchangeCode(code);
      console.log("[photos] token exchange ok");
      return res.redirect(`${web}/settings?photos=connected`);
    } catch (e) {
      const reason = publicReason(e instanceof Error ? e.message : "oauth_failed");
      logPhotosError("token_exchange", e);
      logEvent("photos_oauth_failed", { message: reason });
      return res.redirect(`${web}/settings?photos=error&reason=${encodeURIComponent(reason)}`);
    }
  });

  v1.post("/integrations/google-photos/disconnect", async (_req, res) => {
    await disconnectPhotos();
    res.json({ status: "disconnected" });
  });

  v1.post("/integrations/google-photos/sync", async (_req, res) => {
    if (!photosConfigured()) {
      console.error("[photos] sync blocked: google_photos_disabled");
      return res.status(400).json({ error: "google_photos_disabled" });
    }
    if (!(await photosConnected())) {
      console.error("[photos] sync blocked: photos_not_connected — click Connect first");
      return res.status(400).json({ error: "photos_not_connected" });
    }
    try {
      const result = await syncGooglePhotos(new HttpPhotosClient());
      console.log("[photos] sync result", result);
      res.json(result);
    } catch (e) {
      logPhotosError("sync", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "sync_failed" });
    }
  });
}
