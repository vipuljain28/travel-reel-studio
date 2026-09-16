# Phase 10 — Hardening

Status: **verified**

- CORS locked to WEB_ORIGIN
- JSON body cap 2mb
- 120 req/min/IP (health excluded)
- Path confinement on scan + render
- FFmpeg argv only
- Logger strips token/secret/password/authorization/baseUrl
- App budgets for Photos / Gemini / Places
- No Photos base URLs stored
- .env, media, output, temp, db gitignored
- 429 on rate limit; 500 never includes stack traces
