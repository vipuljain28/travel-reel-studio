import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectTrips } from "./trips.js";
describe("trips", () => {
  it("splits on large time gaps", () => {
    const trips = detectTrips([
      { dateTaken: new Date("2026-09-05T10:00:00Z"), locationName: "Mulshi" },
      { dateTaken: new Date("2026-09-06T10:00:00Z"), locationName: "Mulshi" },
      { dateTaken: new Date("2026-10-01T10:00:00Z"), locationName: "Goa" },
    ]);
    assert.equal(trips.length, 2);
    assert.match(trips[0].title, /Mulshi/);
  });
});
