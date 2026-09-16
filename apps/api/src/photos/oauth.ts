import { config } from "../config.js";
import { prisma } from "../prisma.js";
import { saveTokens, loadTokens, clearTokens } from "./tokens.js";

export const PHOTOS_SCOPES = [
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
].join(" ");

export function photosConfigured(): boolean {
  return Boolean(config.googlePhotos && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: PHOTOS_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "token_exchange_failed");
  }
  const existing = await loadTokens();
  await saveTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token || existing?.refreshToken || null,
    expiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
  });
  try {
    await prisma.syncState.upsert({
      where: { provider: "google-photos" },
      create: { provider: "google-photos", status: "connected" },
      update: { status: "connected", errors: null },
    });
  } catch { /* ignore */ }
}

export async function getAccessToken(): Promise<string> {
  const row = await loadTokens();
  if (!row) throw new Error("photos_not_connected");
  const exp = row.expiresAt ? Date.parse(row.expiresAt) : 0;
  if (exp > Date.now() + 60_000) return row.accessToken;
  if (!row.refreshToken) throw new Error("photos_refresh_missing");
  const body = new URLSearchParams({
    refresh_token: row.refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error || "photos_refresh_failed");
  await saveTokens({
    accessToken: json.access_token,
    refreshToken: row.refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
  });
  return json.access_token;
}

export async function photosConnected(): Promise<boolean> {
  const row = await loadTokens();
  return Boolean(row?.accessToken || row?.refreshToken);
}

export async function disconnectPhotos(): Promise<void> {
  await clearTokens();
  try {
    await prisma.syncState.deleteMany({ where: { provider: "google-photos" } });
  } catch { /* ignore */ }
}
