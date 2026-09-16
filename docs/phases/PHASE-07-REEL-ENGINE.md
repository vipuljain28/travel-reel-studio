# Phase 7 — Reel Engine

Status: **verified**

RenderPlan is renderer-independent JSON:
- 1080×1920 @ 30fps
- clips with mediaId, start, duration, crop, transition
- overlays and optional audio volume
- no FFmpeg flags in the contract

Templates only change pacing/transition/overlay placement.
`GET /projects/:id/render-plan` already persists this JSON.
