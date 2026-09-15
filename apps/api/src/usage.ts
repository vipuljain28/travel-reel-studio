import { prisma } from "./prisma.js";
import { config } from "./config.js";
function today() { return new Date().toISOString().slice(0, 10); }
export async function bump(id: string, budget: number) {
  const resetDate = today();
  const existing = await prisma.usageCounter.findUnique({ where: { id } });
  if (!existing || existing.resetDate !== resetDate) {
    return prisma.usageCounter.upsert({ where: { id }, create: { id, used: 1, budget, resetDate }, update: { used: 1, budget, resetDate } });
  }
  return prisma.usageCounter.update({ where: { id }, data: { used: { increment: 1 }, budget } });
}
export async function snapshot() {
  const rows = await prisma.usageCounter.findMany();
  return {
    note: "These are application safety budgets, not official provider quotas.",
    googlePhotos: { requestsToday: rows.find((r) => r.id === "photos")?.used ?? 0, appBudget: config.photosBudget, mediaByteBudget: config.photosByteBudget },
    gemini: { requestsToday: rows.find((r) => r.id === "gemini")?.used ?? 0, appRpmLimit: config.aiRpm, appRpdLimit: config.aiRpd },
    places: { requestsToday: rows.find((r) => r.id === "places")?.used ?? 0, appBudget: config.placesBudget },
  };
}
