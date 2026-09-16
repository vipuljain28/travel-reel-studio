import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildClipArgs, buildConcatArgs, assertNoShell } from "./ffmpeg.js";
describe("ffmpeg argv", () => {
  it("builds image clip args without a shell string", () => {
    const args = buildClipArgs({ mediaId: "a", filePath: "/media/a.jpg", mediaType: "image" }, 2.4, "/tmp/a.mp4");
    assert.ok(args.includes("libx264"));
    assert.ok(args.some((a) => a.includes("1080:1920")));
    assertNoShell(args);
  });
  it("concat is H.264 + AAC 30fps", () => {
    const args = buildConcatArgs("/tmp/list.txt", "/output/reel.mp4", 0.3);
    assert.ok(args.includes("libx264") && args.includes("aac") && args.includes("30"));
    assertNoShell(args);
  });
});
