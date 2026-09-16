import type { PhotosClient, PhotosPage } from "./types.js";
import { getAccessToken } from "./oauth.js";

export class HttpPhotosClient implements PhotosClient {
  async listPage(pageToken?: string): Promise<PhotosPage> {
    const token = await getAccessToken();
    const url = new URL("https://photoslibrary.googleapis.com/v1/mediaItems");
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as {
      mediaItems?: Array<{
        id: string;
        mimeType?: string;
        filename?: string;
        mediaMetadata?: { creationTime?: string; width?: string; height?: string };
        baseUrl?: string;
      }>;
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || `photos_list_${res.status}`);
    const items = (json.mediaItems || []).map((item) => ({
      id: item.id,
      mimeType: item.mimeType,
      filename: item.filename,
      creationTime: item.mediaMetadata?.creationTime,
      width: item.mediaMetadata?.width ? Number(item.mediaMetadata.width) : undefined,
      height: item.mediaMetadata?.height ? Number(item.mediaMetadata.height) : undefined,
    }));
    return { items, nextPageToken: json.nextPageToken };
  }
}
