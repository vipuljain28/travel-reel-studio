# Travel Reel Studio v0.1

**Build stunning Instagram Reels from your travel photos and videos — locally, intelligently, AI-ready.**

Travel Reel Studio is a local-first application that turns your existing travel media into high-quality 9:16 Instagram Reels. Organize by trip, let AI select the best assets, and generate professional Reels without leaving your computer.

## 🎯 What This Does (V0.1)

- 📁 **Local Media Scanner** — Recursively scans folders, extracts metadata from photos & videos
- 🏷️ **Smart Metadata** — EXIF, creation dates, resolution, location data (when available)
- ⭐ **Quality Scoring** — Blur detection, exposure analysis, aspect-ratio suitability
- 🔍 **Duplicate Detection** — Identify and group duplicate/near-duplicate media
- 🔎 **Search & Filter** — Find media by name, date, location, trip, quality
- 📋 **Projects & Templates** — Create Reel projects with predefined templates
- 📐 **Render Plans** — AI-independent JSON storyboards (ready for rendering in V0.4)
- 🌐 **Web Dashboard** — React-based UI for local browsing and creation
- ⚙️ **REST API** — Extensible backend for future integrations

## 🚀 Quick Start (Windows)

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **FFmpeg** (optional for V0.1, required for video metadata in V0.3+)

### 1. Clone & Install

```bash
git clone https://github.com/vipuljain28/travel-reel-studio.git
cd travel-reel-studio
npm install
```

### 2. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` to set your local paths:

```env
NODE_ENV=development
PORT=4000
MEDIA_ROOT=D:\MyMedia\travel
OUTPUT_ROOT=D:\TravelReelStudio\output
DATABASE_PATH=D:\TravelReelStudio\database\travel.db
```

**Note:** Create directories if they don't exist. `MEDIA_ROOT` should contain your travel photos/videos.

### 3. Start Development Server

```bash
npm run dev
```

This starts:
- **API** on `http://localhost:4000`
- **Frontend** on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### 4. Scan Your Media

1. Click **[Scan Media]** button
2. System recursively scans `MEDIA_ROOT`
3. Extracts metadata (EXIF, dates, resolution, etc.)
4. Calculates quality scores
5. Detects duplicates
6. Media appears in grid

### 5. Search & Create Projects

- **Search** — Type location, trip name, date
- **Create Project** — Select template, duration, media
- **View Render Plan** — See deterministic JSON storyboard

## 📁 Project Structure

```
travel-reel-studio/
│
├── apps/
│   ├── api/                      # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── media/
│   │   │   │   ├── projects/
│   │   │   │   ├── scanner/
│   │   │   │   └── ...
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   ├── package.json
│   │   └── ...
│   │
│   └── web/                      # React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── ...
│
├── packages/
│   └── shared/                   # Shared types & schemas
│       ├── types.ts
│       ├── schemas.ts
│       └── package.json
│
├── media/                        # Local media (gitignored)
├── output/                       # Generated Reels (gitignored)
├── projects/                     # Project data
├── database/                     # SQLite (gitignored)
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📊 API Overview

### Health & Status
```
GET /api/health
```

### Media
```
POST   /api/media/scan              # Trigger scanner
GET    /api/media                   # List all media
GET    /api/media/:id               # Get media details
GET    /api/media/search            # Search media
GET    /api/media/duplicates        # Get duplicate groups
```

### Projects
```
POST   /api/projects                # Create project
GET    /api/projects                # List projects
GET    /api/projects/:id            # Get project
PATCH  /api/projects/:id            # Update project
DELETE /api/projects/:id            # Delete project
```

### Render Plans
```
GET    /api/projects/:id/render-plan     # Generate render plan
GET    /api/templates                    # List templates
```

## 🎬 Templates (V0.1)

Pre-configured Reel structures:

1. **Viral Travel** — Fast cuts, hooks, trending
2. **Luxury Cinematic** — Slow, wide shots, ambience
3. **Hotel Review** — Property showcase
4. **Personal Travel Story** — Journey narrative

## 💾 Database

Uses **SQLite** with **TypeORM**.

Schema includes:
- **Media** — Files, metadata, quality, location, trip
- **Projects** — Reel projects, template selection
- **Duplicates** — Grouped duplicate media
- **RenderPlans** — Generated storyboards

Located at: `DATABASE_PATH` (default: `./database/travel.db`)

## 🔧 Development Commands

```bash
# Install dependencies (root + all workspaces)
npm install

# Start dev server (API + Frontend together)
npm run dev

# API only
npm run api:dev

# Frontend only
npm run web:dev

# Build for production
npm run build

# Database migrations
npm run db:migrate

# Type checking
npm run type-check
```

## 📋 Media Scanner Behavior

The scanner:

1. **Discovers** — Recursively walks `MEDIA_ROOT`
2. **Filters** — Supports: JPG, PNG, WEBP, HEIC, MP4, MOV, M4V
3. **Extracts** — EXIF (dates, GPS, camera), video metadata (ffprobe if available)
4. **Calculates** — Quality score, blur detection, exposure
5. **Deduplicates** — Hash-based exact duplicates (V0.1), perceptual hashing in V0.2
6. **Persists** — Stores in SQLite, avoids re-scanning unchanged files

**Idempotent**: Running scanner multiple times is safe — it won't duplicate records.

## ⭐ Quality Scoring

Media is scored on:

- **Resolution** (30%) — Higher is better; 1080p+ preferred for 9:16 crops
- **Sharpness** (30%) — Laplacian variance; blurry assets score lower
- **Exposure** (15%) — Detects over/underexposure
- **Composition** (15%) — Aspect ratio suitability for 9:16 crops
- **File integrity** (10%) — Readable, valid media

**Score range**: 0.0–1.0. Scores below 0.4 are typically excluded from AI selection.

## 🔍 Search Capabilities

Query examples:

```
Goa
Goa trip
Green Gate Resort
Mulshi
Green Gate Resort, Mulshi
September 2026
trip:goa
location:mulshi
quality:>0.7
```

Searches across:
- Filename
- Folder paths
- Stored location metadata
- Trip names
- Creation dates

## 🎨 Render Plans

A render plan is a **deterministic JSON document** describing how to create a Reel:

```json
{
  "canvas": { "width": 1080, "height": 1920, "fps": 30 },
  "duration": 28,
  "clips": [
    {
      "mediaId": "abc123",
      "start": 0,
      "duration": 2.4,
      "crop": { "mode": "cover" },
      "transition": "cut"
    }
  ],
  "textOverlays": [
    {
      "text": "POV: Weekend escape",
      "start": 0,
      "duration": 2.4,
      "position": "center"
    }
  ],
  "audio": {
    "track": "music/example.mp3",
    "volume": 0.35
  }
}
```

**Why separate?** This allows rendering via:
- FFmpeg (V0.4)
- Browser preview (V0.5)
- Cloud renderer (Future)
- Custom renderers

AI logic is independent of rendering.

## 🔐 Security

- ✅ Path traversal protection
- ✅ Filesystem access validation
- ✅ Environment variable secrets (never committed)
- ✅ API input validation
- ✅ FFmpeg argument safety (no shell injection)
- ✅ Media access restricted to configured roots

## 📦 What's NOT Included Yet (V0.2+)

- ❌ Google Photos integration
- ❌ Gemini AI Director
- ❌ FFmpeg rendering to MP4
- ❌ Perceptual hashing (near-duplicates)
- ❌ Automatic trip/location grouping
- ❌ Music library management
- ❌ One-click Reel generation
- ❌ Cloud deployment

## 🛠️ Troubleshooting

### "MEDIA_ROOT does not exist"
Create the directory and ensure `MEDIA_ROOT` in `.env` is correct.

### "FFmpeg not found"
Video metadata extraction requires FFmpeg. [Install it](https://ffmpeg.org/download.html), or disable video scanning in config.

### Port 4000 already in use
Change `PORT` in `.env`.

### Database file not created
Ensure `DATABASE_PATH` directory exists and is writable.

### No media appears after scan
1. Verify files in `MEDIA_ROOT` are supported formats
2. Check API logs for errors
3. Confirm metadata extraction (especially EXIF)

## 📖 Architecture Philosophy

**Local-first:** App works offline with local media. Cloud services (Google Photos, Gemini) are optional.

**Modular:** Each service (scanner, analyzer, director, renderer) is independent and testable.

**Deterministic:** Render plans are reproducible. Same input → same output (before randomization).

**Extensible:** AI provider? Swap Gemini for Claude. Renderer? Swap FFmpeg for cloud service.

**Type-safe:** Full TypeScript; validated schemas at API boundaries.

## 🚀 Next Steps (V0.2)

- Google Photos OAuth & search
- Gemini-powered asset analysis
- Automatic trip/location detection
- Perceptual duplicate detection
- Music library integration

## 📞 Support

For issues, questions, or contributions, open an issue on GitHub.

---

**Travel Reel Studio v0.1** — Local, intelligent, ready to scale.

Made with ❤️ for travel creators.
