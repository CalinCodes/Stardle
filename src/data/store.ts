/**
 * Tiny file-backed persistence layer.
 *
 * Keeps generated puzzles (with their solutions, server-side only) and the
 * leaderboard durable across restarts. Intentionally simple — a single JSON
 * file under `.data/` — which is plenty for the hackathon. Swap for a real DB
 * later behind these same helpers.
 */
import fs from 'fs';
import path from 'path';

export interface StoredPuzzle {
  id: string;
  format: string;
  topic: string;
  difficulty: string;
  title: string;
  /** Full payload INCLUDING the solution — never sent verbatim to the client. */
  payload: any;
  source: 'gemini' | 'solver' | 'fallback';
  createdAt: string;
}

export interface ScoreEntry {
  username: string;
  gameType: string;
  score: number;
  timeTaken: string;
  guessesCount: number;
  date: string;
  topic?: string;
}

interface StoreShape {
  generatedPuzzles: StoredPuzzle[];
  leaderboard: ScoreEntry[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const today = () => new Date().toISOString().split('T')[0];

const SEED_NAMES = [
  'SolarSurfer', 'OrionCoder', 'NebulaGhost', 'CosmicWhale', 'Supernova', 'QuasarKid', 'PixelSage',
  'VoidWalker', 'NovaByte', 'EchoFox', 'LunarLynx', 'AstroMint', 'ZenithRay', 'GlitchOwl', 'HyperNova',
  'CipherCat', 'TerraByte', 'MeteorMax', 'DriftWood', 'PolarBit', 'RogueWave', 'EmberJinx', 'FluxCapacitR',
  'MidnightDoe', 'SableQuill', 'CobaltFern', 'IrisVolt', 'OnyxHaze', 'VelvetMoth', 'CedarStorm',
  'PixelPenguin', 'QuantumQuokka', 'RetroRaccoon', 'TangoTiger', 'UmberWolf', 'VioletViper', 'WispWren',
];

// Sensory games are scored out of 50; everything else out of ~100.
const SENSORY = new Set(['color', 'shape', 'sound', 'time']);
const SEED_GAME_TYPES = [
  'color', 'shape', 'sound', 'time',
  'codex', 'connections', 'wordgrid', 'quiz',
  'sudoku', 'zip', 'queens',
  'semantic', 'prompt', 'zeitgeist', 'detective', 'riddle', 'negotiation', 'dialect', 'missinglink',
];

function seedLeaderboard(): ScoreEntry[] {
  const d = today();
  const rows: ScoreEntry[] = [];
  let salt = 7;
  const rng = () => { salt = (salt * 1103515245 + 12345) & 0x7fffffff; return salt / 0x7fffffff; };

  for (const gameType of SEED_GAME_TYPES) {
    const max = SENSORY.has(gameType) ? 50 : 100;
    const count = 14 + Math.floor(rng() * 7); // 14–20 players per board
    const names = [...SEED_NAMES].sort(() => rng() - 0.5).slice(0, count);
    for (const username of names) {
      const score = Math.round(max * (0.45 + rng() * 0.55)); // mid-to-high band
      const mins = Math.floor(rng() * 4);
      const secs = Math.floor(rng() * 60);
      rows.push({
        username,
        gameType,
        score,
        timeTaken: `${mins}m ${secs.toString().padStart(2, '0')}s`,
        guessesCount: 1 + Math.floor(rng() * 6),
        date: d,
      });
    }
  }
  return rows;
}

let cache: StoreShape | null = null;

function load(): StoreShape {
  if (cache) return cache;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreShape>;
      cache = {
        generatedPuzzles: parsed.generatedPuzzles ?? [],
        leaderboard: parsed.leaderboard ?? seedLeaderboard(),
      };
      return cache;
    }
  } catch (err) {
    console.error('[store] failed to read store, starting fresh:', err);
  }
  cache = { generatedPuzzles: [], leaderboard: seedLeaderboard() };
  persist();
  return cache;
}

function persist(): void {
  if (!cache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] failed to write store:', err);
  }
}

/* ----------------------------- Puzzles ----------------------------------- */

export function savePuzzle(p: StoredPuzzle): void {
  const s = load();
  s.generatedPuzzles.unshift(p);
  // Keep the pool bounded so the file doesn't grow forever.
  if (s.generatedPuzzles.length > 500) s.generatedPuzzles.length = 500;
  persist();
}

export function getPuzzle(id: string): StoredPuzzle | undefined {
  return load().generatedPuzzles.find((p) => p.id === id);
}

export function listPuzzles(limit = 20): StoredPuzzle[] {
  return load().generatedPuzzles.slice(0, limit);
}

/* --------------------------- Leaderboard --------------------------------- */

export function addScore(entry: ScoreEntry): void {
  const s = load();
  s.leaderboard.unshift(entry);
  if (s.leaderboard.length > 2000) s.leaderboard.length = 2000;
  persist();
}

export function getLeaderboard(filter?: { gameType?: string; date?: string }): ScoreEntry[] {
  let rows = load().leaderboard;
  if (filter?.date) rows = rows.filter((r) => r.date === filter.date);
  if (filter?.gameType) rows = rows.filter((r) => r.gameType === filter.gameType);
  return rows;
}
