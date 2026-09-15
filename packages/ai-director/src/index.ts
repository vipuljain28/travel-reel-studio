export interface AssetCandidate { mediaId: string; qualityScore: number; locationName?: string | null; aiDescription?: string | null; }
export interface Storyboard {
  title: string; hook: string; duration: number;
  selectedAssets: Array<{ mediaId: string; score: number; reason: string }>;
  timeline: Array<{ mediaId: string; start: number; duration: number; text: string; transition: "cut" | "fade" }>;
  caption: string; cta: string;
}
export interface AiProvider {
  analyzeAssets(assets: AssetCandidate[]): Promise<AssetCandidate[]>;
  createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number; }): Promise<Storyboard>;
}
export class MockAiProvider implements AiProvider {
  async analyzeAssets(assets: AssetCandidate[]): Promise<AssetCandidate[]> {
    return [...assets].sort((a, b) => b.qualityScore - a.qualityScore);
  }
  async createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number; }): Promise<Storyboard> {
    const picked = [...input.assets].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 8);
    const dest = input.destination || "this trip";
    const duration = input.duration ?? Math.max(12, picked.length * 2.4);
    let t = 0;
    const timeline = picked.map((a, i) => {
      const d = 2.4;
      const row = { mediaId: a.mediaId, start: t, duration: d, text: i === 0 ? `POV: ${dest}` : a.locationName || dest, transition: "cut" as const };
      t += d;
      return row;
    });
    return {
      title: `Weekend escape to ${dest}`,
      hook: `POV: You found the perfect weekend escape — ${dest}`,
      duration,
      selectedAssets: picked.map((a) => ({ mediaId: a.mediaId, score: a.qualityScore, reason: "Deterministic quality ranking (AI offline)" })),
      timeline,
      caption: `Memories from ${dest}. Shot on the road, cut locally.`,
      cta: "Save this place for your next weekend trip",
    };
  }
}
export function getAiProvider(_geminiEnabled: boolean): AiProvider {
  return new MockAiProvider();
}
