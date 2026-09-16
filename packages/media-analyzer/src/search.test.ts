import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, parseSearchQuery, inferPlaceFromPath } from "./search.js";
describe("search", () => {
  const mulshi = {
    filePath: "/media/Mulshi/IMG_001.jpg",
    locationName: "Green Gate Resort",
    tripTitle: "Mulshi Weekend",
    dateTaken: new Date("2026-09-05T10:00:00Z"),
    qualityScore: 0.82,
    mediaType: "image",
  };
  it("parses filters", () => {
    const q = parseSearchQuery("Green Gate location:mulshi quality:>0.7 January 2026");
    assert.equal(q.location, "mulshi");
    assert.equal(q.qualityMin, 0.7);
    assert.equal(q.month, 1);
    assert.equal(q.year, 2026);
  });
  it("matches place query from folder + location", () => {
    assert.equal(matchesSearch(mulshi, "Green Gate Resort, Mulshi"), true);
  });
  it("matches place query from folder only", () => {
    const onlyFolder = { filePath: "G:\\projects\\travel-reel-studio\\media\\Mulshi\\IMG_001.jpg", locationName: null, mediaType: "image" };
    assert.equal(matchesSearch(onlyFolder, "Green Gate Resort, Mulshi"), true);
    assert.equal(matchesSearch(onlyFolder, "mulshi"), true);
  });
  it("filters by quality", () => {
    assert.equal(matchesSearch(mulshi, "quality:>0.9"), false);
    assert.equal(matchesSearch(mulshi, "quality:>0.7"), true);
  });
  it("filters by month year", () => {
    assert.equal(matchesSearch(mulshi, "September 2026"), true);
    assert.equal(matchesSearch(mulshi, "January 2026"), false);
  });
  it("infers folder place", () => {
    assert.equal(inferPlaceFromPath("/data/Goa/beach.jpg"), "Goa");
  });
});
