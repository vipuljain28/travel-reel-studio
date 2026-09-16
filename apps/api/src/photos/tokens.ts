import { promises as fs } from "node:fs";
import path from "node:path";
import { repoRoot } from "../config.js";
import { prisma } from "../prisma.js";

export type PhotoTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
};

const tokenFile = path.join(repoRoot, "database", "google-photos-token.json");

export async function saveTokens(tokens: PhotoTokens): Promise<void> {
  await fs.mkdir(path.dirname(tokenFile), { recursive: true });
  await fs.writeFile(tokenFile, JSON.stringify(tokens), "utf8");
  try {
    await prisma.integrationCredential.upsert({
      where: { provider: "google-photos" },
      create: {
        provider: "google-photos",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
      },
    });
  } catch {
    /* table may not exist until prisma db push */
  }
}

export async function loadTokens(): Promise<PhotoTokens | null> {
  try {
    const row = await prisma.integrationCredential.findUnique({ where: { provider: "google-photos" } });
    if (row?.accessToken) {
      return {
        accessToken: row.accessToken,
        refreshToken: row.refreshToken,
        expiresAt: row.expiresAt?.toISOString() ?? null,
      };
    }
  } catch {
    /* fall through to file */
  }
  try {
    const raw = await fs.readFile(tokenFile, "utf8");
    return JSON.parse(raw) as PhotoTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await fs.rm(tokenFile, { force: true }).catch(() => undefined);
  try {
    await prisma.integrationCredential.deleteMany({ where: { provider: "google-photos" } });
  } catch {
    /* ignore */
  }
}
