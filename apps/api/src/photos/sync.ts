import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { Budget, QuotaExceededError } from "../quota.js";
import { logEvent } from "../logger.js";
import { mapPhotosItem, type PhotosClient } from "./types.js";
export async function syncGooglePhotos(client: PhotosClient, budget = new Budget("photos", config.photosBudget)) {
  let state = await prisma.syncState.upsert({
    where: { provider: "google-photos" },
    create: { provider: "google-photos", status: "RUNNING" },
    update: { status: "RUNNING" },
  });
  let pageToken: string | undefined = state.cursor || undefined;
  let itemsProcessed = state.itemsProcessed ?? 0;
  let requests = 0;
  try {
    while (true) {
      if (!budget.canSpend(1)) {
        await prisma.syncState.update({
          where: { provider: "google-photos" },
          data: { status: "QUOTA_LIMIT", cursor: pageToken ?? null, itemsProcessed },
        });
        throw new QuotaExceededError("photos");
      }
      budget.spend(1);
      requests += 1;
      const page = await client.listPage(pageToken);
      for (const item of page.items) {
        const mapped = mapPhotosItem(item);
        await prisma.media.upsert({
          where: { provider_filePath: { provider: "google-photos", filePath: `photos:${mapped.providerMediaId}` } },
          create: { ...mapped, filePath: `photos:${mapped.providerMediaId}` },
          update: {
            mimeType: mapped.mimeType,
            mediaType: mapped.mediaType,
            width: mapped.width,
            height: mapped.height,
            dateTaken: mapped.dateTaken,
            providerMediaId: mapped.providerMediaId,
          },
        });
        itemsProcessed += 1;
      }
      pageToken = page.nextPageToken;
      await prisma.syncState.update({
        where: { provider: "google-photos" },
        data: { cursor: pageToken ?? null, itemsProcessed },
      });
      if (!pageToken) break;
    }
    await prisma.syncState.update({
      where: { provider: "google-photos" },
      data: { status: "COMPLETED", lastSync: new Date(), cursor: null, itemsProcessed },
    });
    logEvent("google_photos_sync", { itemsProcessed, requests });
    return { status: "COMPLETED" as const, itemsProcessed, requests };
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      logEvent("google_photos_sync", { itemsProcessed, requests, status: "QUOTA_LIMIT" });
      return { status: "QUOTA_LIMIT" as const, itemsProcessed, requests };
    }
    await prisma.syncState.update({
      where: { provider: "google-photos" },
      data: { status: "FAILED", errors: err instanceof Error ? err.message : "sync_failed" },
    });
    throw err;
  }
}
