import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHealth } from "./health.js";

describe("health", () => {
  it("reports local offline mode by default", () => {
    const h = buildHealth({ googlePhotos: false, gemini: false, places: false });
    assert.equal(h.ok, true);
    assert.equal(h.mode, "local");
    assert.equal(h.offline, true);
    assert.equal(h.service, "travel-reel-studio");
  });

  it("reports hybrid when one integration is on", () => {
    const h = buildHealth({ googlePhotos: true, gemini: false, places: false });
    assert.equal(h.mode, "hybrid");
    assert.equal(h.offline, false);
  });
});
