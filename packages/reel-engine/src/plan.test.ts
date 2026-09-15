import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRenderPlan, validateRenderPlan } from "./index.js";
describe("render plan", () => {
  it("builds a valid 9:16 plan", () => {
    const plan = buildRenderPlan({ mediaIds: ["a", "b", "c"], template: "viral-travel", hook: "POV: Weekend escape" });
    assert.equal(plan.canvas.height, 1920);
    assert.equal(validateRenderPlan(plan).length, 0);
  });
});
