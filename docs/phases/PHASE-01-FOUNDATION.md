# Phase 1 — Foundation

Status: **verified**

## Goal
Runnable monorepo: API health, web shell, config, Prisma schema, logging, CI, docs.

## Checklist
- [x] npm workspaces (`apps/*`, `packages/*`)
- [x] `.env.example` with all provider flags and app budgets
- [x] Prisma schema: Media, Trip, Project, RenderJob, UsageCounter, PlaceCache, SyncState
- [x] `GET /api/v1/health` returns `mode`, `offline`, feature flags
- [x] Web dashboard shell
- [x] Structured logger (redacts secrets)
- [x] GitHub Actions: install → prisma generate → `npm test`
- [x] Unit tests: path safety + health modes

## Verify
```bash
npm install
npx prisma generate --schema apps/api/prisma/schema.prisma
npm test
```

Expected: quality, trips, render-plan, path-safety, and health tests pass.

## Out of scope
Live Google APIs, Gemini HTTP, FFmpeg encode.
