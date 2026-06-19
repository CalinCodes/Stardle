/**
 * LinkedIn-style logic puzzles — fully deterministic (no LLM).
 *
 *  - Zip:    draw ONE path that fills every cell, passing the numbered
 *            checkpoints in order (cover-all "connect the dots").
 *  - Queens: place N crowns, one per row, column and colour region, with no
 *            two crowns touching (including diagonally).
 */

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===================================================================== */
/* ZIP — Hamiltonian path with ordered checkpoints                       */
/* ===================================================================== */

export interface ZipPuzzle {
  rows: number;
  cols: number;
  checkpoints: { r: number; c: number; n: number }[];
  solutionPath: [number, number][]; // one valid full path (for reference)
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Randomized backtracking search for a Hamiltonian path covering all cells. */
function findHamiltonianPath(rows: number, cols: number): [number, number][] | null {
  const total = rows * cols;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const path: [number, number][] = [];
  let steps = 0;
  const STEP_CAP = 200000;

  const startR = Math.floor(Math.random() * rows);
  const startC = Math.floor(Math.random() * cols);

  function dfs(r: number, c: number): boolean {
    if (steps++ > STEP_CAP) return false;
    visited[r][c] = true;
    path.push([r, c]);
    if (path.length === total) return true;
    for (const [dr, dc] of shuffle(DIRS)) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        if (dfs(nr, nc)) return true;
      }
    }
    visited[r][c] = false;
    path.pop();
    return false;
  }

  return dfs(startR, startC) ? path : null;
}

/** Fallback: a guaranteed boustrophedon (snake) path. */
function snakePath(rows: number, cols: number): [number, number][] {
  const path: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) for (let c = 0; c < cols; c++) path.push([r, c]);
    else for (let c = cols - 1; c >= 0; c--) path.push([r, c]);
  }
  return path;
}

export function generateZip(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): ZipPuzzle {
  // Harder = bigger board AND many more numbered dots to thread through in order.
  const size = difficulty === 'hard' ? 7 : difficulty === 'easy' ? 4 : 6;
  let path = findHamiltonianPath(size, size) || snakePath(size, size);

  // Easy: just a few dots on a small board. Hard: lots of dots on a big board.
  const numCheckpoints = difficulty === 'hard' ? 12 : difficulty === 'easy' ? 3 : 6;
  const total = path.length;

  // Always anchor checkpoint 1 at the start and the last at the end, spread the rest.
  const idxs = [0];
  for (let k = 1; k < numCheckpoints - 1; k++) {
    idxs.push(Math.round((k * (total - 1)) / (numCheckpoints - 1)));
  }
  idxs.push(total - 1);
  const uniqueIdxs = [...new Set(idxs)].sort((a, b) => a - b);

  const checkpoints = uniqueIdxs.map((idx, i) => {
    const [r, c] = path[idx];
    return { r, c, n: i + 1 };
  });

  return { rows: size, cols: size, checkpoints, solutionPath: path };
}

/** Validate a player's drawn path. Checkpoints are public, so this is pure rule-checking. */
export function checkZip(p: ZipPuzzle, rawPath: any): {
  valid: boolean;
  solved: boolean;
  message: string;
} {
  if (!Array.isArray(rawPath) || rawPath.length === 0)
    return { valid: false, solved: false, message: 'Draw a path first.' };

  const path: [number, number][] = rawPath.map((c: any) => [c[0], c[1]]);
  const total = p.rows * p.cols;
  const seen = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (r < 0 || r >= p.rows || c < 0 || c >= p.cols)
      return { valid: false, solved: false, message: 'Path leaves the grid.' };
    const key = `${r},${c}`;
    if (seen.has(key)) return { valid: false, solved: false, message: 'A cell is used twice.' };
    seen.add(key);
    if (i > 0) {
      const [pr, pc] = path[i - 1];
      if (Math.abs(pr - r) + Math.abs(pc - c) !== 1)
        return { valid: false, solved: false, message: 'Path must move to adjacent cells.' };
    }
  }

  if (path.length !== total)
    return { valid: true, solved: false, message: `Cover all ${total} cells (${path.length} so far).` };

  const order = [...p.checkpoints].sort((a, b) => a.n - b.n);
  const first = order[0];
  const last = order[order.length - 1];

  // Must start on dot #1 and end on the highest-numbered dot.
  const [sr, sc] = path[0];
  const [er, ec] = path[path.length - 1];
  if (sr !== first.r || sc !== first.c)
    return { valid: true, solved: false, message: 'The line must start on dot 1.' };
  if (er !== last.r || ec !== last.c)
    return { valid: true, solved: false, message: `The line must end on dot ${last.n}.` };

  // Checkpoints must be visited in ascending order.
  let lastIdx = -1;
  for (const cp of order) {
    const idx = path.findIndex(([r, c]) => r === cp.r && c === cp.c);
    if (idx <= lastIdx)
      return { valid: true, solved: false, message: `Visit the dots in order (1 → ${order.length}).` };
    lastIdx = idx;
  }

  return { valid: true, solved: true, message: 'Perfect path!' };
}

/* ===================================================================== */
/* QUEENS — one crown per row/col/region, none touching                  */
/* ===================================================================== */

export interface QueensPuzzle {
  n: number;
  regions: number[][]; // colour region index per cell
  solution: number[]; // col index of the queen in each row (reference)
}

/** Random permutation where adjacent rows' columns differ by >= 2 (no diagonal touch). */
function findQueenSolution(n: number): number[] | null {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const cols = shuffle(Array.from({ length: n }, (_, i) => i));
    let ok = true;
    for (let i = 1; i < n; i++) {
      if (Math.abs(cols[i] - cols[i - 1]) < 2) {
        ok = false;
        break;
      }
    }
    if (ok) return cols;
  }
  return null;
}

/** Grow N contiguous colour regions, each seeded at one queen cell. */
function growRegions(n: number, solution: number[]): number[][] {
  const regions = Array.from({ length: n }, () => Array(n).fill(-1));
  // Frontier per region: list of candidate neighbour cells.
  const frontiers: [number, number][][] = [];
  for (let r = 0; r < n; r++) {
    regions[r][solution[r]] = r; // region id == row of its queen
    frontiers.push([[r, solution[r]]]);
  }

  let remaining = n * n - n;
  while (remaining > 0) {
    let progressed = false;
    for (let region = 0; region < n; region++) {
      const frontier = frontiers[region];
      // Try to claim a random adjacent unowned cell.
      const candidates: [number, number][] = [];
      for (const [r, c] of frontier) {
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
            candidates.push([nr, nc]);
          }
        }
      }
      if (candidates.length === 0) continue;
      const [pr, pc] = candidates[Math.floor(Math.random() * candidates.length)];
      if (regions[pr][pc] === -1) {
        regions[pr][pc] = region;
        frontier.push([pr, pc]);
        remaining--;
        progressed = true;
      }
    }
    if (!progressed) {
      // Assign any leftover cell to a neighbouring region (safety net).
      for (let r = 0; r < n && remaining > 0; r++) {
        for (let c = 0; c < n && remaining > 0; c++) {
          if (regions[r][c] !== -1) continue;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] !== -1) {
              regions[r][c] = regions[nr][nc];
              remaining--;
              break;
            }
          }
        }
      }
      break;
    }
  }
  return regions;
}

export function generateQueens(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): QueensPuzzle {
  const n = difficulty === 'hard' ? 8 : difficulty === 'easy' ? 6 : 7;
  let solution = findQueenSolution(n);
  while (!solution) solution = findQueenSolution(n);
  const regions = growRegions(n, solution);
  return { n, regions, solution };
}

/** Check player's crown placements against all Queens constraints. */
export function checkQueens(p: QueensPuzzle, rawQueens: any): {
  valid: boolean;
  solved: boolean;
  message: string;
} {
  if (!Array.isArray(rawQueens))
    return { valid: false, solved: false, message: 'Place your crowns.' };
  const queens: [number, number][] = rawQueens.map((q: any) => [q[0], q[1]]);
  const n = p.n;

  if (queens.length !== n)
    return { valid: true, solved: false, message: `Place ${n} crowns (you have ${queens.length}).` };

  const rows = new Set<number>();
  const cols = new Set<number>();
  const regs = new Set<number>();
  for (const [r, c] of queens) {
    if (r < 0 || r >= n || c < 0 || c >= n)
      return { valid: false, solved: false, message: 'Crown is off the board.' };
    rows.add(r);
    cols.add(c);
    regs.add(p.regions[r][c]);
  }
  if (rows.size !== n) return { valid: true, solved: false, message: 'Only one crown per row.' };
  if (cols.size !== n) return { valid: true, solved: false, message: 'Only one crown per column.' };
  if (regs.size !== n) return { valid: true, solved: false, message: 'Only one crown per colour region.' };

  // No two crowns touching (including diagonally).
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const dr = Math.abs(queens[i][0] - queens[j][0]);
      const dc = Math.abs(queens[i][1] - queens[j][1]);
      if (dr <= 1 && dc <= 1)
        return { valid: true, solved: false, message: 'Crowns cannot touch each other.' };
    }
  }

  return { valid: true, solved: true, message: 'Royal flush — solved!' };
}
