# Phase 2 — Local Media

Status: **verified**

## Implemented
- Recursive walk of `MEDIA_ROOT` for jpg/jpeg/png/webp/heic/mp4/mov/m4v
- Idempotent upsert on `(provider, filePath)`
- Skip rewrite when SHA-256 + size unchanged
- PNG/JPEG width×height from headers (no full decode)
- JPEG EXIF DateTimeOriginal when present
- Sample-based sharpness/exposure + configurable quality formula
- SHA-256 exact duplicates → `duplicateGroupId`
- Lightweight pHash stand-in from file prefix
- Video metadata via `ffprobe` when installed
- Thumbnail pointers under `TEMP_ROOT/thumbs/{sha}.src.txt`
- Path confined to media root

## Verify
```bash
npm test
# drop a photo into ./media then POST /api/v1/media/scan
```
