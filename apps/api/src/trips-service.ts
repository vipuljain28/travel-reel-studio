import { detectTrips, inferPlaceFromPath } from "@trs/media-analyzer";
import { prisma } from "./prisma.js";
import { logEvent } from "./logger.js";

export async function detectAndPersistTrips(replace = true) {
  if (replace) {
    await prisma.media.updateMany({ data: { tripId: null } });
    await prisma.trip.deleteMany();
  }
  const media = await prisma.media.findMany();
  const detected = detectTrips(media.map((m) => ({
    dateTaken: m.dateTaken ?? m.createdAt,
    latitude: m.latitude,
    longitude: m.longitude,
    locationName: m.locationName || inferPlaceFromPath(m.filePath),
  })));
  const created = [];
  for (const trip of detected) {
    const row = await prisma.trip.create({
      data: {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        placeName: trip.title.replace(/ trip$/i, ""),
      },
    });
    for (const idx of trip.mediaIndexes) {
      const item = media[idx];
      const inferred = item.locationName || inferPlaceFromPath(item.filePath);
      await prisma.media.update({
        where: { id: item.id },
        data: { tripId: row.id, locationName: inferred },
      });
    }
    created.push({ ...row, mediaCount: trip.mediaIndexes.length });
  }
  logEvent("trip_detect", { trips: created.length, media: media.length, replace });
  return created;
}
