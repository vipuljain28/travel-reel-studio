import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pngSize, imageSizeFromBuffer } from "./image-headers.js";
function tinyPng(): Buffer {
  return Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000002000000020802000000fdc414f80000000c4944415408d763f8cf0f000301010018dd8d8f0000000049454e44ae426082",
    "hex",
  );
}
describe("image headers", () => {
  it("reads PNG size", () => {
    const size = pngSize(tinyPng());
    assert.ok(size);
    assert.equal(size.width, 2);
    assert.equal(size.height, 2);
  });
  it("dispatches PNG via imageSizeFromBuffer", () => {
    assert.equal(imageSizeFromBuffer(tinyPng())?.width, 2);
  });
});
