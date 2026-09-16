import type { AssetCandidate, AiProvider } from "./types.js";
import { parseStoryboard, type Storyboard } from "./schema.js";
import { MockAiProvider } from "./mock.js";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
export class GeminiAiProvider implements AiProvider {
  private readonly fallback = new MockAiProvider();
  constructor(private readonly apiKey: string, private readonly fetchFn: typeof fetch = fetch) {}
  analyzeAssets(assets: AssetCandidate[]) { return this.fallback.analyzeAssets(assets); }
  async createStoryboard(input: { assets: AssetCandidate[]; destination?: string; template?: string; duration?: number }): Promise<Storyboard> {
    const ranked = await this.analyzeAssets(input.assets);
    try {
      const res = await this.fetchFn(`${GEMINI_URL}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Return ONLY JSON matching the storyboard schema. Destination: ${input.destination || "unknown"}. Duration: ${input.duration ?? 24}. Assets: ${JSON.stringify(ranked.slice(0, 12))}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) return this.fallback.createStoryboard({ ...input, assets: ranked });
      const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return this.fallback.createStoryboard({ ...input, assets: ranked });
      return parseStoryboard(JSON.parse(text));
    } catch {
      return this.fallback.createStoryboard({ ...input, assets: ranked });
    }
  }
}
