import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LocalPlaceProvider } from "./local.js";
import { PLACES_FIELD_MASK } from "./google.js";
import { normalizeQuery } from "./types.js";
describe("places", () => {
  it("falls back locally without an API key", async () => {
    const p = await new LocalPlaceProvider().resolve("Green Gate Resort, Mulshi");
    assert.equal(p?.name, "Green Gate Resort");
    assert.equal(p?.address, "Mulshi");
    assert.equal(p?.source, "local-fallback");
  });
  it("normalizes cache keys", () => {
    assert.equal(normalizeQuery("  Green   Gate  "), "green gate");
  });
  it("uses a tight field mask", () => {
    assert.equal(PLACES_FIELD_MASK.includes("photos"), false);
    assert.equal(PLACES_FIELD_MASK.includes("reviews"), false);
  });
});
