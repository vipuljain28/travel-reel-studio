import type { Storyboard } from "./schema.js";
export interface AssetCandidate {
  mediaId: string;
  qualityScore: number;
  locationName?: string | null;
  aiDescription?: string | null;
}
export interface AiProvider {
  analyzeAssets(assets: AssetCandidate[]): Promise<AssetCandidate[]>;
  createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number }): Promise<Storyboard>;
}
