import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, RotateCcw, Crown } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  puzzleId: string;
  puzzle: { n: number; regions: number[][] };
  onSolved: (score: number, guesses: number) => void;
}

// A bright "prism" palette for the colour regions.
const REGION_COLORS = [
  '#fde68a', '#fca5a5', '#a7f3d0', '#bfdbfe', '#ddd6fe',
  '#fbcfe8', '#bbf7d0', '#fed7aa', '#c7d2fe', '#99f6e4',
];

type CellState = 0 | 1 | 2; // 0 empty, 1 mark, 2 crown
const key = (r: number, c: number) => `${r},${c}`;

export default function QueensGame({ puzzleId, puzzle, onSolved }: Props) {
  const { n, regions } = puzzle;
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setCells({});
    setSolved(false);
    setMessage('');
    setAttempts(0);
  }, [puzzleId]);

  const queens = useMemo(
    () =>
      Object.entries(cells)
        .filter(([, v]) => v === 2)
        .map(([k]) => k.split(',').map(Number) as [number, number]),
    [cells],
  );

  const cycle = (r: number, c: number) => {
    if (solved) return;
    synth.playTargetSound('click');
    setCells((prev) => {
      const cur = prev[key(r, c)] || 0;
      const next = ((cur + 1) % 3) as CellState;
      return { ...prev, [key(r, c)]: next };
    });
  };

  useEffect(() => {
    if (solved || queens.length !== n) return;
    (async () => {
      setAttempts((a) => a + 1);
      try {
        const res = await fetch('/api/forge/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzleId, guess: queens }),
        });
        const data = await res.json();
        setMessage(data.message || '');
        if (data.solved) {
          setSolved(true);
          synth.playTargetSound('win');
          onSolved(Math.max(10, 105 - attempts * 16), attempts + 1);
        } else {
          synth.playTargetSound('wrong');
        }
      } catch {
        setMessage('Network error.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queens.length]);

  const cellSize = Math.min(52, Math.floor(360 / n));

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-xs font-mono text-stone-600 dark:text-stone-300 bg-yellow-400/10 border-2 border-dashed border-stone-300 dark:border-stone-600 p-3 w-full text-center">
        Place one 👑 in every row, column and colour region — and no two crowns may touch (even diagonally). Tap a cell: dot → 👑 → clear.
      </div>

      <div
        className="grid border-2 border-[#1e1b13] dark:border-stone-400"
        style={{ gridTemplateColumns: `repeat(${n}, ${cellSize}px)` }}
      >
        {Array.from({ length: n }).map((_, r) =>
          Array.from({ length: n }).map((_, c) => {
            const state = cells[key(r, c)] || 0;
            return (
              <button
                key={key(r, c)}
                onClick={() => cycle(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: REGION_COLORS[regions[r][c] % REGION_COLORS.length],
                }}
                className="flex items-center justify-center border border-black/30 cursor-pointer hover:brightness-95"
              >
                {state === 2 && <Crown className="w-5 h-5 text-[#1e1b13] fill-yellow-500" />}
                {state === 1 && <span className="w-1.5 h-1.5 rounded-full bg-black/50" />}
              </button>
            );
          }),
        )}
      </div>

      {message && !solved && <p className="text-xs font-mono text-stone-700 dark:text-stone-300">{message}</p>}

      <button
        onClick={() => {
          setCells({});
          setMessage('');
          synth.playTargetSound('click');
        }}
        className="flex items-center gap-1.5 text-xs font-display font-bold border-2 border-[#1e1b13] dark:border-stone-500 bg-white dark:bg-stone-800 px-4 py-2 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Clear board
      </button>

      {solved && (
        <div className="bg-green-500 text-white border-2 border-green-800 p-3 font-display font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Royal flush — solved!
        </div>
      )}
    </div>
  );
}
