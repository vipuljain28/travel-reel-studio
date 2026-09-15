# Architecture

Modular monolith. AI is the director, not the renderer.

```
Web (React + Vite)
  → API (Express + TypeScript)
      → Media Library
      → Reel Engine
      → Integrations (Photos / Places / Gemini)
      → SQLite (Prisma)
      → FFmpeg renderer
```

## Packages

- `@trs/shared` — types, schemas, constants
- `@trs/media-analyzer` — scan, EXIF, quality, hashes
- `@trs/reel-engine` — templates, storyboard → RenderPlan
- `@trs/ai-director` — AiProvider + Mock + Gemini stub
- `@trs/api` — HTTP, Prisma, jobs
- `@trs/web` — UI

## Modes

- Local: no cloud keys
- Hybrid: local + optional Photos
- Full AI: Photos + Places + Gemini + local render

External integrations are optional and fail closed to local behavior.
