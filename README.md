# Travel Reel Studio

Local-first AI-assisted travel media discovery and Instagram Reel generation.

**AI is the director. FFmpeg is the renderer.** Google Photos, Places, and Gemini are optional.

## Status

Phased implementation. See `docs/PHASES.md`.

Working now:

- Monorepo (web + API + shared packages)
- Health, config, Prisma schema, usage budgets
- Local media scan (idempotent), search, trip detection
- Mock AI director + RenderPlan generator
- Dashboard shell

Not yet: live Google OAuth, Gemini calls, FFmpeg MP4 encode.

## Quick start

```bash
git clone https://github.com/vipuljain28/travel-reel-studio.git
cd travel-reel-studio
cp .env.example .env
mkdir -p media output temp database
npm install
cd apps/api && npx prisma generate && npx prisma db push && cd ../..
npm test
npm run dev
```

- API: http://localhost:4000/api/v1/health
- Web: http://localhost:5173

Put photos under `MEDIA_ROOT` (default `./media`) then click **Scan Media**.

## Modes

| Mode | Requirements |
|---|---|
| Local | none |
| Hybrid | optional Photos / Gemini / Places flags |
| Full AI | all three enabled |

Without keys the app stays in Offline / Local mode and uses deterministic selection.
