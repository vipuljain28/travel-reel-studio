# Phase 3 — Search + Trips

Status: **verified**

## Search
`GET /api/v1/media/search?q=`

- free text: path, folder, location, trip, AI tags, date
- `location:mulshi` `trip:goa` `quality:>0.7` `type:image`
- `September 2026` / `2026-09` / `2026`

## Trips
`POST /api/v1/trips/detect?replace=true`
Groups by 36h gap or >120km. Title = most common place. Fills location from folder names.
`GET /trips` and `GET /trips/:id`
