export type { AssetCandidate, AiProvider } from "./types.js";
export { StoryboardSchema, parseStoryboard, type Storyboard } from "./schema.js";
export { MockAiProvider } from "./mock.js";
export { GeminiAiProvider } from "./gemini.js";
export { TwoPassDirector } from "./director.js";
import { MockAiProvider } from "./mock.js";
import { GeminiAiProvider } from "./gemini.js";
import { TwoPassDirector } from "./director.js";
import type { AiProvider } from "./types.js";
export function getAiProvider(geminiEnabled: boolean): AiProvider {
  const key = process.env.GEMINI_API_KEY;
  const inner = geminiEnabled && key ? new GeminiAiProvider(key) : new MockAiProvider();
  return new TwoPassDirector(inner);
}
