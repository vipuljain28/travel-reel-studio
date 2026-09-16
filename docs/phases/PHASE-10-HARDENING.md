# Phase 10 — Hardening

Status: **verified**

- Path confinement on scan + render
- App-level Photos / Gemini / Places budgets
- FFmpeg argv only
- No stored Photos base URLs
- `.env` and media/output/temp gitignored
- In-memory API rate cap (120 req/min/IP)
- Offline mode is the default
