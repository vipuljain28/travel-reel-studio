# Phase 8 — FFmpeg

Status: **verified**

- spawn argv arrays only (no shell strings)
- 1080x1920 30fps H.264 + AAC
- image loop or video trim → cover crop → concat
- local files only, confined to MEDIA_ROOT
- temp dir deleted after job
- missing ffmpeg → job FAILED
