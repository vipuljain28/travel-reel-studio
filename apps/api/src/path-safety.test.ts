import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { assertInsideRoot } from "./path-safety.js";

describe("path safety", () => {
  it("allows children", () => {
    const p = assertInsideRoot("/tmp/media", "a/b.jpg");
    const norm = p.replaceAll("\\", "/");
    assert.ok(norm.endsWith("a/b.jpg"));
    assert.equal(path.basename(p), "b.jpg");
  });
  it("rejects traversal", () => {
    assert.throws(() => assertInsideRoot("/tmp/media", "../../etc/passwd"));
  });
});
