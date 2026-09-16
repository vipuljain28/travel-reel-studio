import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRenderPlan, validateRenderPlan } from "./index.js";

describe("render plan", () => {
  it("builds a valid 9:16 viral plan", () => {
    const plan = buildRenderPlan({
      mediaIds: ["a", "b", "c"],
      template: "viral-travel",
      hook: "POV: Weekend escape",
    });
    assert.equal(plan.canvas.width, 1080);
    assert.equal(plan.canvas.height, 1920);
    assert.equal(plan.clips[0].transition, "cut");
    assert.equal(validateRenderPlan(plan).length, 0);
  });

  it("luxury template uses fades and slower clips", () => {
    const plan = buildRenderPlan({ mediaIds: ["a", "b"], template: "luxury-cinematic" });
    assert.equal(plan.clips[0].transition, "fade");
    assert.ok(plan.clips[0].duration >= 3);
    assert.equal(validateRenderPlan(plan).length, 0);
  });

  it("rejects empty and overlapping plans", () => {
    assert.ok(validateRenderPlan(buildRenderPlan({ mediaIds: [], template: "viral-travel" })).length > 0);
    const bad = buildRenderPlan({ mediaIds: ["a"], template: "viral-travel" });
    bad.clips.push({ mediaId: "b", start: 0, duration: 2, crop: { mode: "cover" }, transition: "cut" });
    assert.ok(validateRenderPlan(bad).some((e) => /overlap/.test(e)));
  });
});
