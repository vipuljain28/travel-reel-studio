import type { Router } from "express";
import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { logEvent } from "../logger.js";
import { authorizationUrl, photosConfigured, exchangeCode, photosConnected, disconnectPhotos } from "./oauth.js";
import { createPickerSession, getPickerSession, importPickerSession } from "./picker.js";
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
      note: "Google no longer allows listing the whole library. Use Photos Picker, then import. IDs only; no baseUrl stored.",
    });
  });

  v1.get("/integrations/google-photos/connect", (_req, res) => {
    if (!photosConfigured()) {
      console.error("[photos] connect blocked: google_photos_disabled");
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
    console.log("[photos] callback query", { error: googleError || null, hasCode: Boolean(code) });
    if (googleError || !code) {
      const reason = publicReason(googleError || googleDesc || "missing_code");
      console.error("[photos] callback aborted:", reason);
      return res.redirect(`${web}/settings?photos=error&reason=${encodeURIComponent(reason)}`);
    }
    try {
      await exchangeCode(code);
      console.log("[photos] token exchange ok (picker scope)");
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

  v1.post("/integrations/google-photos/picker", async (_req, res) => {
    if (!photosConfigured()) return res.status(400).json({ error: "google_photos_disabled" });
    if (!(await photosConnected())) return res.status(400).json({ error: "photos_not_connected" });
    try {
      const session = await createPickerSession();
      res.json({ status: "PICKER_REQUIRED", ...session });
    } catch (e) {
      logPhotosError("picker_create", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "picker_failed" });
    }
  });

  v1.get("/integrations/google-photos/picker/:id", async (req, res) => {
    try {
      res.json(await getPickerSession(req.params.id));
    } catch (e) {
      logPhotosError("picker_get", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "picker_get_failed" });
    }
  });

  v1.post("/integrations/google-photos/sync", async (req, res) => {
    if (!photosConfigured()) return res.status(400).json({ error: "google_photos_disabled" });
    if (!(await photosConnected())) return res.status(400).json({ error: "photos_not_connected" });
    const sessionId = String(req.body?.sessionId || req.query.sessionId || "");
    try {
      if (!sessionId) {
        const session = await createPickerSession();
        console.log("[photos] full-library sync is blocked by Google; open pickerUri instead");
        return res.json({
          status: "PICKER_REQUIRED",
          ...session,
          error: "Google blocked mediaItems.list. Open pickerUri, pick photos, then POST /sync with sessionId.",
        });
      }
      const result = await importPickerSession(sessionId);
      console.log("[photos] import", result);
      res.json(result);
    } catch (e) {
      logPhotosError("sync", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "sync_failed" });
    }
  });
}
