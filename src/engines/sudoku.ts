/**
 * Deterministic Sudoku generator + solver.
 *
 * Per the project brief, logic puzzles MUST come from a real solver that proves
 * a unique solution — never from the LLM. This module supports a 6x6 (2x3 boxes)
 * "mini" grid and a classic 9x9 grid, both with a guaranteed-unique solution.
 */

export interface SudokuPuzzle {
  size: 4 | 6 | 9;
  boxRows: number; // box height
  boxCols: number; // box width
  givens: number[][]; // 0 = empty
  solution: number[][];
}

interface Dims {
  size: 4 | 6 | 9;
  boxRows: number;
  boxCols: number;
}

function dimsFor(size: 4 | 6 | 9): Dims {
  if (size === 4) return { size, boxRows: 2, boxCols: 2 };
  if (size === 6) return { size, boxRows: 2, boxCols: 3 };
  return { size: 9, boxRows: 3, boxCols: 3 };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyGrid(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function clone(grid: number[][]): number[][] {
  return grid.map((row) => row.slice());
}

function canPlace(grid: number[][], d: Dims, r: number, c: number, val: number): boolean {
  for (let i = 0; i < d.size; i++) {
    if (grid[r][i] === val) return false;
    if (grid[i][c] === val) return false;
  }
  const br = Math.floor(r / d.boxRows) * d.boxRows;
  const bc = Math.floor(c / d.boxCols) * d.boxCols;
  for (let i = 0; i < d.boxRows; i++) {
    for (let j = 0; j < d.boxCols; j++) {
      if (grid[br + i][bc + j] === val) return false;
    }
  }
  return true;
}

/** Fill a complete valid grid via randomized backtracking. */
function fillGrid(grid: number[][], d: Dims): boolean {
  for (let r = 0; r < d.size; r++) {
    for (let c = 0; c < d.size; c++) {
      if (grid[r][c] === 0) {
        const candidates = shuffle(Array.from({ length: d.size }, (_, i) => i + 1));
        for (const val of candidates) {
          if (canPlace(grid, d, r, c, val)) {
            grid[r][c] = val;
            if (fillGrid(grid, d)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/** Count solutions up to `limit` (early-exits once limit reached). */
function countSolutions(grid: number[][], d: Dims, limit = 2): number {
  for (let r = 0; r < d.size; r++) {
    for (let c = 0; c < d.size; c++) {
      if (grid[r][c] === 0) {
        let count = 0;
        for (let val = 1; val <= d.size; val++) {
          if (canPlace(grid, d, r, c, val)) {
            grid[r][c] = val;
            count += countSolutions(grid, d, limit);
            grid[r][c] = 0;
            if (count >= limit) return count;
          }
        }
        return count;
      }
    }
  }
  return 1; // no empties → one complete solution
}

const HOLE_TARGET: Record<string, Record<4 | 6 | 9, number>> = {
  easy: { 4: 6, 6: 16, 9: 40 },
  medium: { 4: 8, 6: 20, 9: 50 },
  hard: { 4: 10, 6: 24, 9: 56 },
};

/**
 * Generate a puzzle with a provably-unique solution by digging holes from a
 * full solution and rejecting any removal that introduces ambiguity.
 */
export function generateSudoku(
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  size: 4 | 6 | 9 = 6,
): SudokuPuzzle {
  const d = dimsFor(size);
  const solution = emptyGrid(d.size);
  fillGrid(solution, d);

  const givens = clone(solution);
  const targetHoles = (HOLE_TARGET[difficulty] ?? HOLE_TARGET.medium)[d.size];

  const cells = shuffle(
    Array.from({ length: d.size * d.size }, (_, i) => [Math.floor(i / d.size), i % d.size] as [number, number]),
  );

  let holes = 0;
  for (const [r, c] of cells) {
    if (holes >= targetHoles) break;
    const backup = givens[r][c];
    if (backup === 0) continue;
    givens[r][c] = 0;
    // Verify the puzzle still has exactly one solution.
    const solutions = countSolutions(clone(givens), d, 2);
    if (solutions !== 1) {
      givens[r][c] = backup; // revert — keep uniqueness
    } else {
      holes++;
    }
  }

  return { size: d.size, boxRows: d.boxRows, boxCols: d.boxCols, givens, solution };
}

/** Validate a fully/partially filled attempt against the solution. */
export function checkSudoku(attempt: number[][], solution: number[][]): {
  solved: boolean;
  correctCells: number;
  totalCells: number;
  wrong: [number, number][];
} {
  const size = solution.length;
  let correct = 0;
  let filled = 0;
  const wrong: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = attempt?.[r]?.[c] ?? 0;
      if (v !== 0) {
        filled++;
        if (v === solution[r][c]) correct++;
        else wrong.push([r, c]);
      }
    }
  }
  return {
    solved: correct === size * size,
    correctCells: correct,
    totalCells: size * size,
    wrong,
  };
}
