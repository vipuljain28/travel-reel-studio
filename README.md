# Travel Reel Studio

Local-first AI-assisted travel media discovery and Instagram Reel generation.

**AI is the director. FFmpeg is the renderer.** Google Photos, Places, and Gemini are optional.

See `docs/PHASES.md` for the 10-phase status.

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

Drop photos into `./media`, then Library → Scan.

## Flow

1. Scan local media
2. Search / detect trips
3. Create a project (destination text is enough)
4. Generate storyboard (mock AI unless Gemini is enabled)
5. Build RenderPlan
6. Render (needs `ffmpeg` on PATH)

## Modes

| Mode | Requirements |
|---|---|
| Local | none |
| Hybrid | any of Photos / Gemini / Places |
| Full AI | all three |

Without keys the product still works offline.
