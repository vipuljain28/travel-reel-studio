# Phase 1 — Foundation

## Goal
Runnable monorepo: API health, web shell, config, Prisma schema, logging, CI, docs.

## Done when
- `npm install` works
- API `/api/v1/health` returns mode + feature flags
- Web loads dashboard shell
- Prisma schema covers Media, Trip, Project, RenderJob, UsageCounter
- `.env.example` documents all keys
- GitHub Actions type-check/test (best-effort)
