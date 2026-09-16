import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapPhotosItem } from "./types.js";
describe("google photos mapping", () => {
  it("stores providerMediaId and never a baseUrl field", () => {
    const mapped = mapPhotosItem({
      id: "abc123",
      mimeType: "image/jpeg",
      creationTime: "2026-09-05T10:00:00Z",
      width: 4000,
      height: 3000,
    });
    assert.equal(mapped.providerMediaId, "abc123");
    assert.equal("baseUrl" in mapped, false);
  });
  it("classifies video mime", () => {
    assert.equal(mapPhotosItem({ id: "v1", mimeType: "video/mp4" }).mediaType, "video");
  });
});
