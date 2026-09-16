import { getAccessToken } from "./oauth.js";
import { mapPhotosItem, type PhotosMediaItem } from "./types.js";
import { prisma } from "../prisma.js";
import { inferPlaceFromPath } from "@trs/media-analyzer";

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function createPickerSession() {
  const res = await fetch("https://photospicker.googleapis.com/v1/sessions", {
    method: "POST",
    headers: await authHeaders(),
    body: "{}",
  });
  const json = (await res.json()) as {
    id?: string;
    pickerUri?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id || !json.pickerUri) {
    throw new Error(json.error?.message || `picker_create_${res.status}`);
  }
  console.log("[photos] picker session", json.id);
  return { sessionId: json.id, pickerUri: json.pickerUri };
}

export async function getPickerSession(sessionId: string) {
  const res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
    headers: await authHeaders(),
  });
  const json = (await res.json()) as {
    id?: string;
    mediaItemsSet?: boolean;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `picker_get_${res.status}`);
  return { sessionId: json.id || sessionId, ready: Boolean(json.mediaItemsSet) };
}

export async function importPickerSession(sessionId: string) {
  const session = await getPickerSession(sessionId);
  if (!session.ready) {
    return { status: "WAITING_FOR_PICK" as const, sessionId, itemsProcessed: 0 };
  }
  const items: PhotosMediaItem[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://photospicker.googleapis.com/v1/mediaItems");
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: await authHeaders() });
    const json = (await res.json()) as {
      mediaItems?: Array<{
        id?: string;
        createTime?: string;
        type?: string;
        mediaFile?: {
          mimeType?: string;
          filename?: string;
          mediaFileMetadata?: { width?: number; height?: number };
        };
        baseUrl?: string;
      }>;
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `picker_list_${res.status}`);
    for (const raw of json.mediaItems || []) {
      if (!raw.id) continue;
      items.push({
        id: raw.id,
        mimeType: raw.mediaFile?.mimeType,
        filename: raw.mediaFile?.filename,
        creationTime: raw.createTime,
        width: raw.mediaFile?.mediaFileMetadata?.width,
        height: raw.mediaFile?.mediaFileMetadata?.height,
      });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  let itemsProcessed = 0;
  for (const item of items) {
    const mapped = mapPhotosItem(item);
    const locationName = inferPlaceFromPath(item.filename || "") || null;
    await prisma.media.upsert({
      where: { provider_filePath: { provider: "google-photos", filePath: `photos:${mapped.providerMediaId}` } },
      create: { ...mapped, filePath: `photos:${mapped.providerMediaId}`, locationName },
      update: {
        mimeType: mapped.mimeType,
        mediaType: mapped.mediaType,
        width: mapped.width,
        height: mapped.height,
        dateTaken: mapped.dateTaken,
        providerMediaId: mapped.providerMediaId,
        locationName,
      },
    });
    itemsProcessed += 1;
  }
  await prisma.syncState.upsert({
    where: { provider: "google-photos" },
    create: { provider: "google-photos", status: "COMPLETED", lastSync: new Date(), itemsProcessed },
    update: { status: "COMPLETED", lastSync: new Date(), itemsProcessed, errors: null },
  });
  console.log("[photos] picker imported", itemsProcessed);
  return { status: "COMPLETED" as const, sessionId, itemsProcessed };
}
