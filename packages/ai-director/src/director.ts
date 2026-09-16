import type { AssetCandidate, AiProvider } from "./types.js";
import { parseStoryboard, type Storyboard } from "./schema.js";
export class TwoPassDirector implements AiProvider {
  constructor(private readonly inner: AiProvider) {}
  analyzeAssets(assets: AssetCandidate[]) { return this.inner.analyzeAssets(assets); }
  async createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number }): Promise<Storyboard> {
    const ranked = await this.inner.analyzeAssets(input.assets);
    const board = await this.inner.createStoryboard({ ...input, assets: ranked });
    return parseStoryboard(board);
  }
}
