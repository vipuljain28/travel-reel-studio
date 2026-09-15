import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertInsideRoot } from "./path-safety.js";
describe("path safety", () => {
  it("allows children", () => {
    const p = assertInsideRoot("/tmp/media", "a/b.jpg");
    assert.ok(p.endsWith("a/b.jpg"));
  });
  it("rejects traversal", () => {
    assert.throws(() => assertInsideRoot("/tmp/media", "../../etc/passwd"));
  });
});
