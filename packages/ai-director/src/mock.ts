import type { AssetCandidate, AiProvider } from "./types.js";
import { parseStoryboard, type Storyboard } from "./schema.js";
export class MockAiProvider implements AiProvider {
  async analyzeAssets(assets: AssetCandidate[]): Promise<AssetCandidate[]> {
    return [...assets].sort((a, b) => b.qualityScore - a.qualityScore);
  }
  async createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number }): Promise<Storyboard> {
    const picked = (await this.analyzeAssets(input.assets)).slice(0, 8);
    const dest = input.destination || "this trip";
    const slot = 2.4;
    let t = 0;
    const timeline = picked.map((a, i) => {
      const row = {
        mediaId: a.mediaId,
        start: Number(t.toFixed(2)),
        duration: slot,
        text: i === 0 ? `POV: ${dest}` : a.locationName || dest,
        transition: "cut" as const,
      };
      t += slot;
      return row;
    });
    return parseStoryboard({
      title: `Weekend escape to ${dest}`,
      hook: `POV: You found the perfect weekend escape — ${dest}`,
      duration: input.duration ?? Math.max(12, picked.length * slot),
      selectedAssets: picked.map((a) => ({ mediaId: a.mediaId, score: a.qualityScore, reason: "Deterministic quality ranking (AI offline)" })),
      timeline,
      caption: `Memories from ${dest}. Shot on the road, cut locally.`,
      cta: "Save this place for your next weekend trip",
    });
  }
}
