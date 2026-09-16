import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allow, resetRateLimit } from "./rate-limit.js";
describe("rate limit", () => {
  it("allows under the cap and blocks after", () => {
    resetRateLimit();
    assert.equal(allow("1.1.1.1", 3, 60_000), true);
    assert.equal(allow("1.1.1.1", 3, 60_000), true);
    assert.equal(allow("1.1.1.1", 3, 60_000), true);
    assert.equal(allow("1.1.1.1", 3, 60_000), false);
    assert.equal(allow("2.2.2.2", 3, 60_000), true);
  });
});
