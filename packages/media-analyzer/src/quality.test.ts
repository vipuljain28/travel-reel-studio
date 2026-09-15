import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreMedia, resolutionScore } from "./quality.js";
describe("quality", () => {
  it("scores 1080p reasonably high", () => {
    const s = scoreMedia({ width: 1920, height: 1080, sharpness: 0.8, exposure: 0.7 });
    assert.ok(s > 0.6);
  });
  it("zero pixels is 0 resolution", () => { assert.equal(resolutionScore(0, 0), 0); });
});
