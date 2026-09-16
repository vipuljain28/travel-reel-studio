# Travel Reel Studio — Setup and Usage

Local-first travel photo library and Instagram Reel generator.

- **AI directs** (storyboard JSON).
- **FFmpeg renders** (H.264 9:16 MP4).
- Google Photos, Places, and Gemini are **optional**. With no keys the app stays offline.

Repo: https://github.com/vipuljain28/travel-reel-studio

---

## 1. Requirements

| Tool | Version |
|---|---|
| Node.js | 18+ (22 used in CI) |
| npm | 9+ |
| FFmpeg | on `PATH` only if you want a real MP4 |

Windows / macOS / Linux all work. FFmpeg is **not** required to scan, search, or generate a storyboard.

Install FFmpeg if you will render:

- macOS: `brew install ffmpeg`
- Ubuntu/Debian: `sudo apt install ffmpeg`
- Windows: install a build and add `ffmpeg` to PATH, then `ffmpeg -version`

---

## 2. First-time setup

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

| Process | URL |
|---|---|
| Web UI | http://localhost:5173 |
| API health | http://localhost:4000/api/v1/health |

Vite proxies `/api` from port 5173 to 4000. Use the web origin for the UI.

Default `.env` is already in **local / offline** mode (`GOOGLE_PHOTOS_ENABLED=false`, `GEMINI_ENABLED=false`, `PLACES_ENABLED=false`).

---

## 3. Folders

| Path | Role |
|---|---|
| `./media` | Drop photos and videos here (`MEDIA_ROOT`) |
| `./output` | Finished `{jobId}.mp4` files |
| `./temp` | Scratch files, deleted after each render |
| `./database` | SQLite file from `DATABASE_URL` |

Supported extensions:

- Images: `jpg`, `jpeg`, `png`, `webp`, `heic`
- Video: `mp4`, `mov`, `m4v`

`media/`, `output/`, `temp/`, `.env`, and `*.db` are gitignored.

---

## 4. Environment

Copy `.env.example` → `.env`. Important keys:

```
PORT=4000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL="file:../../database/travel.db"
MEDIA_ROOT=./media
OUTPUT_ROOT=./output
TEMP_ROOT=./temp

GOOGLE_PHOTOS_ENABLED=false
GEMINI_ENABLED=false
PLACES_ENABLED=false
```

Optional cloud flags (leave off until you have keys):

| Variable | Used for |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Photos OAuth |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `GEMINI_API_KEY` | Gemini storyboard (fallback to mock if invalid) |
| `GOOGLE_PLACES_API_KEY` | Places API (New) text search |

The sample file also lists `GOOGLE_MAPS_API_KEY`. The Places client reads **`GOOGLE_PLACES_API_KEY`**. Set that name if you enable Places.

Application **safety budgets** (not official Google quotas):

```
GOOGLE_PHOTOS_DAILY_REQUEST_BUDGET=8000
GOOGLE_PHOTOS_MEDIA_BYTE_DAILY_BUDGET=60000
AI_RPM_LIMIT=5
AI_RPD_LIMIT=100
PLACES_DAILY_REQUEST_BUDGET=100
```

---

## 5. Modes

| Mode | When |
|---|---|
| **Local** | All cloud flags false (default) |
| **Hybrid** | Any one of Photos / Gemini / Places on |
| **Full AI** | All three on |

`GET /api/v1/health` reports `mode` and `offline`.

---

## 6. Use the product (UI)

Open http://localhost:5173

### 6.1 Library
1. Copy trip photos into `./media` (folders like `media/Mulshi/IMG_001.jpg` help search).
2. **Library → Scan MEDIA_ROOT**.
3. First scan upserts; second scan of the same files should **skip**.

### 6.2 Search
Examples:

- `Green Gate Resort, Mulshi`
- `location:mulshi`
- `quality:>0.7`
- `type:image`
- `September 2026` or `2026-09`

Search runs on the **local index**, not live Google Photos.

### 6.3 Trips
**Trips → Detect trips** groups by ~36 hour gaps or >120 km. Titles use the most common place / folder name.

### 6.4 Make a Reel
1. **Projects → Create** (title + destination text is enough).
2. Open the project.
3. **Generate storyboard** — mock AI unless Gemini is enabled.
4. **Build RenderPlan** — 1080×1920 @ 30fps JSON contract.
5. **Render** — starts a job (`QUEUED` → `RENDERING` → `COMPLETED` / `FAILED`).
6. **Poll job**. On success the file is `output/{jobId}.mp4`.

Needs:

- A saved RenderPlan (step 4)
- Local files under `MEDIA_ROOT` (Google Photos IDs will not encode until downloaded)
- `ffmpeg` on PATH

### 6.5 Integrations and usage
Settings shows Photos / Places / Gemini status. Usage shows **app** request budgets, not Google’s published quotas.

---

## 7. API cheat sheet

Base: `http://localhost:4000/api/v1`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Mode, offline, feature flags |
| POST | `/media/scan` | Scan `MEDIA_ROOT` |
| GET | `/media` | Library |
| GET | `/media/search?q=` | Local search |
| GET | `/media/duplicates` | SHA-256 groups |
| POST | `/trips/detect` | Group into trips |
| GET | `/trips` | List trips |
| POST | `/places/resolve` | `{ "query": "Green Gate Resort, Mulshi" }` |
| GET | `/templates` | Reel templates |
| POST | `/projects` | `{ title, destination, templateId }` |
| POST | `/projects/:id/storyboard` | AI / mock director |
| GET | `/projects/:id/render-plan` | Persist RenderPlan |
| POST | `/render` | `{ "projectId" }` → 202 job |
| GET | `/render/:id` | Job status |
| GET | `/usage` | App budgets |
| GET | `/integrations/google-photos` | Photos status |
| GET | `/integrations/google-photos/connect` | Auth URL if configured |

Templates: `viral-travel`, `luxury-cinematic`, `hotel-review`, `personal-story`.

---

## 8. Typical local script (no UI)

```bash
curl -s http://localhost:4000/api/v1/health
curl -s -X POST http://localhost:4000/api/v1/media/scan
curl -s "http://localhost:4000/api/v1/media/search?q=Mulshi"
curl -s -X POST http://localhost:4000/api/v1/trips/detect

curl -s -X POST http://localhost:4000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"title":"Mulshi weekend","destination":"Green Gate Resort, Mulshi","templateId":"viral-travel"}'
```

Then storyboard → render-plan → `POST /render` with the project id.

---

## 9. Optional cloud

### Gemini
Set `GEMINI_ENABLED=true` and `GEMINI_API_KEY`. Invalid JSON or HTTP errors fall back to the mock director. Storyboards are always schema-validated.

### Places
Set `PLACES_ENABLED=true` and `GOOGLE_PLACES_API_KEY`. Resolves a query once, caches it, uses field mask `places.id,places.displayName,places.formattedAddress,places.location`. Without a key, `"Green Gate Resort, Mulshi"` still splits locally into name + region.

### Google Photos
Set `GOOGLE_PHOTOS_ENABLED=true` plus OAuth client id/secret. Scope is `photoslibrary.readonly` only. The app stores **media IDs**, never temporary `baseUrl`s. Token exchange and a live Library fetch client are stubbed behind `PhotosClient` — local scan does not depend on them.

There is **no** GPS-radius search in the Photos Library API. Place search is local + Places.

---

## 10. Render notes

- Output: **1080×1920, 30 fps, H.264 + AAC**
- FFmpeg is spawned with an **argv array** (no shell strings)
- Only `provider=local` files under `MEDIA_ROOT` are encoded
- Missing `ffmpeg` → job `FAILED`
- Storyboard text overlays are in the RenderPlan; burn-in (`drawtext`) is not in the current encoder pass

---

## 11. Troubleshooting

| Symptom | What to check |
|---|---|
| Web cannot reach API | API on :4000, `WEB_ORIGIN`, Vite proxy |
| Scan finds 0 files | Files under `MEDIA_ROOT` with supported extensions |
| Search empty | Scan first; try folder name as query |
| `render_plan_missing` | Call **Build RenderPlan** before Render |
| Job `FAILED` / ffmpeg error | `ffmpeg -version`; only local files in the plan |
| Photos connect 400 | Flags + client id/secret |
| Prisma errors | `npx prisma generate` and `db push` from `apps/api` with `DATABASE_URL` set |

```bash
npm test
curl -s http://localhost:4000/api/v1/health
```

---

## 12. Architecture (short)

Monorepo workspaces: `apps/api`, `apps/web`, `packages/shared`, `media-analyzer`, `ai-director`, `reel-engine`.

SQLite via Prisma. Health and usage endpoints never expose secrets. API rate limit: 120 requests / minute / IP (`/health` excluded).
