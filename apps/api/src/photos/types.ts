export interface PhotosMediaItem {
  id: string;
  mimeType?: string;
  filename?: string;
  creationTime?: string;
  width?: number;
  height?: number;
}
export interface PhotosPage { items: PhotosMediaItem[]; nextPageToken?: string; }
export interface PhotosClient { listPage(pageToken?: string): Promise<PhotosPage>; }
export function mapPhotosItem(item: PhotosMediaItem) {
  const mime = item.mimeType || "image/jpeg";
  return {
    provider: "google-photos" as const,
    providerMediaId: item.id,
    filePath: null as string | null,
    mimeType: mime,
    mediaType: mime.startsWith("video") ? "video" : "image",
    width: item.width ?? null,
    height: item.height ?? null,
    dateTaken: item.creationTime ? new Date(item.creationTime) : null,
  };
}
