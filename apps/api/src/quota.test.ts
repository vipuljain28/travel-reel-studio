import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Budget, QuotaExceededError, shouldRetry } from "./quota.js";
describe("quota", () => {
  it("enforces app safety budget", () => {
    const b = new Budget("photos", 3);
    b.spend(); b.spend(); b.spend();
    assert.equal(b.remaining(), 0);
    assert.throws(() => b.spend(), QuotaExceededError);
  });
  it("retries 429 and 5xx only", () => {
    assert.equal(shouldRetry(429), true);
    assert.equal(shouldRetry(503), true);
    assert.equal(shouldRetry(400), false);
    assert.equal(shouldRetry(401), false);
  });
});
