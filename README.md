<div align="center">
<h1>Stardle</h1>
</div>

Stardle is a collection of daily mini-games (wordplay, riddles, zeitgeist emoji puzzles, AI-prompt detective, and more) built with React + Vite and an Express server. The app can optionally use Google Gemini (GenAI) for smarter validation, falling back to local rule-based logic when the API key is not provided.

<img width="1454" height="796" alt="image" src="https://github.com/user-attachments/assets/59dd0319-d5c3-4eb6-8d37-d96f829c46d5" />

**Highlights**
- Multiple game types: Synonym Seekers, Prompt Detective, Emoji Zeitgeist, Riddles, Detective puzzles, and more.
- Optional Google Gemini integration for semantic matching (`GEMINI_API_KEY`).
- Deterministic daily puzzles seeded by date for consistent daily challenges.

**Tech stack**
- Frontend: React 19 + Vite
- Server: Express + TypeScript (server entry: `server.ts`)
- AI: `@google/genai` (optional)

---

**Prerequisites**
- Node.js (16+ recommended)
- npm or an npm-compatible client

**Quick start (development)**

1. Install dependencies

   npm install

2. Create a local environment file (optional)

   - Copy `.env.local.example` to `.env.local` or create a `.env.local` file.
   - Optionally set `GEMINI_API_KEY` (or leave unset to use local fallback logic).
   - You can also set `GEMINI_MODEL` to override the default model (defaults to `gemini-3.5-flash`).

3. Run the dev server

   npm run dev

The dev server starts the Express server (`server.ts`) which in turn serves the Vite-built frontend.

**Available npm scripts** (see [package.json](package.json))
- `npm run dev` — run the app in development (uses `tsx server.ts`)
- `npm run build` — build frontend and bundle server for production
- `npm run start` — run the bundled production server (`node dist/server.cjs`)
- `npm run preview` — preview the built frontend with Vite
- `npm run clean` — remove build artifacts
- `npm run lint` — TypeScript type check

**Environment variables**
- `GEMINI_API_KEY` — (optional) Google Gemini API key. If missing, the server uses rule-based fallbacks.
- `GEMINI_MODEL` — (optional) model id override. Defaults to `gemini-3.5-flash`.
- `PORT` — (optional) server port (default: `3000`).

**Project layout**
- `src/` — React app and components
  - `components/` — individual game components and views
  - `data/` — puzzle pools and lightweight store (`puzzles.ts`, `store.ts`)
  - `engines/` — game engine logic (forge, sudoku, etc.)
- `server.ts` — Express + Vite integration and API endpoints
- `public/` — static assets and service worker

