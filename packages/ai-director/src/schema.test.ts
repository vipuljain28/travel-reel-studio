import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockAiProvider } from "./mock.js";
import { parseStoryboard } from "./schema.js";
import { TwoPassDirector } from "./director.js";
describe("ai director", () => {
  it("mock storyboard validates against schema", async () => {
    const board = await new MockAiProvider().createStoryboard({
      destination: "Mulshi",
      assets: [
        { mediaId: "a", qualityScore: 0.9, locationName: "Green Gate" },
        { mediaId: "b", qualityScore: 0.4 },
      ],
    });
    assert.match(board.hook, /Mulshi/);
    assert.equal(board.selectedAssets[0].mediaId, "a");
    parseStoryboard(board);
  });
  it("rejects invalid JSON", () => {
    assert.throws(() => parseStoryboard({ title: "x" }));
  });
  it("two-pass ranks before storyboard", async () => {
    const board = await new TwoPassDirector(new MockAiProvider()).createStoryboard({
      assets: [
        { mediaId: "low", qualityScore: 0.1 },
        { mediaId: "high", qualityScore: 0.99 },
      ],
    });
    assert.equal(board.selectedAssets[0].mediaId, "high");
  });
});
