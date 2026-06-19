import React, { useEffect, useState } from 'react';
import { Sparkles, Eraser } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  puzzleId: string;
  puzzle: { size: number; boxRows: number; boxCols: number; givens: number[][] };
  onSolved: (score: number, guesses: number) => void;
}

export default function SudokuGame({ puzzleId, puzzle, onSolved }: Props) {
  const [grid, setGrid] = useState<number[][]>(puzzle.givens.map((r) => r.slice()));
  const [active, setActive] = useState<[number, number] | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    setGrid(puzzle.givens.map((r) => r.slice()));
    setActive(null);
    setWrong(new Set());
    setMessage('');
    setSolved(false);
    setChecks(0);
  }, [puzzleId]);

  const isGiven = (r: number, c: number) => puzzle.givens[r][c] !== 0;
  const size = puzzle.size;
  const cellPx = size === 9 ? 36 : 46;

  const setCell = (val: number) => {
    if (!active || solved) return;
    const [r, c] = active;
    if (isGiven(r, c)) return;
    setGrid((g) => {
      const ng = g.map((row) => row.slice());
      ng[r][c] = val;
      return ng;
    });
    setWrong((w) => {
      const nw = new Set(w);
      nw.delete(`${r},${c}`);
      return nw;
    });
  };

  const check = async () => {
    setChecks((n) => n + 1);
    try {
      const res = await fetch('/api/forge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId, guess: grid }),
      });
      const data = await res.json();
      if (data.solved) {
        setSolved(true);
        synth.playTargetSound('win');
        onSolved(Math.max(10, 105 - checks * 20), checks + 1);
      } else {
        setWrong(new Set((data.wrong || []).map((p: number[]) => `${p[0]},${p[1]}`)));
        const filled = grid.flat().filter((v) => v !== 0).length;
        setMessage(
          filled < size * size
            ? `${data.correctCells}/${size * size} correct so far — keep going.`
            : 'Some cells are wrong (highlighted).',
        );
        synth.playTargetSound('wrong');
      }
    } catch {
      setMessage('Network error.');
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-xs font-mono text-stone-600 bg-yellow-400/10 border-2 border-dashed border-stone-300 p-3 w-full text-center">
        Fill the grid so every row, column and box contains 1–{size}. Tap a cell, then a number.
      </div>

      <div
        className="grid border-[3px] border-[#1e1b13] dark:border-stone-300 bg-[#1e1b13] dark:bg-stone-300"
        style={{ gridTemplateColumns: `repeat(${size}, ${cellPx}px)` }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const given = isGiven(r, c);
            const isActive = active && active[0] === r && active[1] === c;
            const isWrong = wrong.has(`${r},${c}`);
            // thick borders on box edges, thin grid lines elsewhere
            const rightEdge = (c + 1) % puzzle.boxCols === 0 && c !== size - 1;
            const bottomEdge = (r + 1) % puzzle.boxRows === 0 && r !== size - 1;
            return (
              <button
                key={`${r},${c}`}
                onClick={() => !given && setActive([r, c])}
                style={{
                  width: cellPx,
                  height: cellPx,
                  color: isWrong ? '#7f1d1d' : isActive ? '#1e1b13' : 'var(--ink)',
                  borderRightWidth: c === size - 1 ? 0 : rightEdge ? 3 : 1,
                  borderBottomWidth: r === size - 1 ? 0 : bottomEdge ? 3 : 1,
                }}
                className={`flex items-center justify-center font-display font-bold text-base sm:text-lg select-none border-[#1e1b13] dark:border-stone-500 ${
                  isWrong
                    ? 'bg-red-300'
                    : isActive
                    ? 'bg-yellow-300'
                    : given
                    ? 'bg-stone-200 dark:bg-stone-700 cursor-default'
                    : 'bg-white dark:bg-stone-800 cursor-pointer'
                }`}
              >
                {val !== 0 ? val : ''}
              </button>
            );
          }),
        )}
      </div>

      {/* Number pad */}
      {!solved && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setCell(n)}
              className="w-9 h-9 bg-white border-2 border-[#1e1b13] font-display font-bold hover:bg-yellow-200 cursor-pointer shadow-[1px_1px_0_#1e1b13]"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setCell(0)}
            className="w-9 h-9 bg-white border-2 border-[#1e1b13] flex items-center justify-center hover:bg-red-200 cursor-pointer shadow-[1px_1px_0_#1e1b13]"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && !solved && <p className="text-xs font-mono text-stone-700">{message}</p>}

      {!solved ? (
        <button
          onClick={check}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-display font-bold border-2 border-[#1e1b13] px-6 py-2.5 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
        >
          CHECK
        </button>
      ) : (
        <div className="bg-green-500 text-white border-2 border-green-800 p-3 font-display font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Solved!
        </div>
      )}
    </div>
  );
}
