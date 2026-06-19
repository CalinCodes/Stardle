import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Checkpoint {
  r: number;
  c: number;
  n: number;
}

interface Props {
  puzzleId: string;
  puzzle: { rows: number; cols: number; checkpoints: Checkpoint[] };
  onSolved: (score: number, guesses: number) => void;
}

const key = (r: number, c: number) => `${r},${c}`;

export default function ZipGame({ puzzleId, puzzle, onSolved }: Props) {
  const { rows, cols, checkpoints } = puzzle;
  const [path, setPath] = useState<[number, number][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);

  const CELL = Math.min(60, Math.floor(380 / cols));
  const W = cols * CELL;
  const H = rows * CELL;
  const center = (r: number, c: number) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

  const cpMap = useMemo(() => {
    const m = new Map<string, number>();
    checkpoints.forEach((cp) => m.set(key(cp.r, cp.c), cp.n));
    return m;
  }, [checkpoints]);

  const inPath = useMemo(() => new Set(path.map(([r, c]) => key(r, c))), [path]);

  useEffect(() => {
    setPath([]);
    setSolved(false);
    setMessage('');
    setAttempts(0);
  }, [puzzleId]);

  // Drag toward a target cell, filling in every cell along the way (orthogonally,
  // row-first then column). This makes fast straight drags render and lets you
  // drag back over the line to undo — including all the way to the start dot.
  const dragTo = (tr: number, tc: number) => {
    if (solved) return;
    setPath((prev) => {
      if (prev.length === 0) {
        // The path MUST begin on dot #1.
        return cpMap.get(key(tr, tc)) === 1 ? [[tr, tc]] : prev;
      }
      let cur = prev;
      let guard = 0;
      while (guard++ < 400) {
        const [hr, hc] = cur[cur.length - 1];
        if (hr === tr && hc === tc) break;
        let nr = hr;
        let nc = hc;
        if (hr !== tr) nr = hr + Math.sign(tr - hr);
        else nc = hc + Math.sign(tc - hc);
        const idx = cur.findIndex(([pr, pc]) => pr === nr && pc === nc);
        if (idx !== -1) {
          cur = cur.slice(0, idx + 1); // dragging back over the line undoes it
        } else {
          cur = [...cur, [nr, nc]];
        }
      }
      return cur;
    });
  };

  // Geometry-based hit-testing so DRAGGING works for both touch and mouse
  // (per-cell onPointerEnter never fires during a touch drag).
  const cellFromXY = (clientX: number, clientY: number): [number, number] | null => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left) / CELL);
    const r = Math.floor((clientY - rect.top) / CELL);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return [r, c];
  };

  const onDown = (e: React.PointerEvent) => {
    if (solved) return;
    e.preventDefault();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    drawingRef.current = true;
    setDrawing(true);
    const cell = cellFromXY(e.clientX, e.clientY);
    if (cell) {
      if (path.length === 0 && cpMap.get(key(cell[0], cell[1])) !== 1) {
        setMessage('Start on dot 1.');
        return;
      }
      setMessage('');
      dragTo(cell[0], cell[1]);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const cell = cellFromXY(e.clientX, e.clientY);
    if (cell) dragTo(cell[0], cell[1]);
  };

  const stop = () => { drawingRef.current = false; setDrawing(false); };

  useEffect(() => {
    if (solved || path.length !== rows * cols) return;
    (async () => {
      setAttempts((a) => a + 1);
      try {
        const res = await fetch('/api/forge/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puzzleId, guess: path }),
        });
        const data = await res.json();
        setMessage(data.message || '');
        if (data.solved) {
          setSolved(true);
          synth.playTargetSound('win');
          onSolved(Math.max(10, 105 - attempts * 18), attempts + 1);
        } else {
          synth.playTargetSound('wrong');
        }
      } catch {
        setMessage('Network error.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const polyPoints = path.map(([r, c]) => { const p = center(r, c); return `${p.x},${p.y}`; }).join(' ');
  const head = path.length ? center(path[path.length - 1][0], path[path.length - 1][1]) : null;

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xs font-mono opacity-60 text-center max-w-sm">
        Start on dot 1 and end on dot {checkpoints.length}, drawing one line that fills every cell and visits the dots in order. Drag to draw; drag back to undo.
      </p>

      <div className="relative rounded-2xl p-3 glass-strong select-none">
        <div
          ref={gridRef}
          className="relative touch-none"
          style={{ width: W, height: H, touchAction: 'none' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        >
          {/* Cell grid (visual only — all input handled on the container) */}
          <div className="grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, pointerEvents: 'none' }}>
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const k = key(r, c);
                return (
                  <div
                    key={k}
                    style={{ width: CELL, height: CELL }}
                    className={`border border-black/5 dark:border-white/5 ${inPath.has(k) ? 'bg-amber-500/10' : ''}`}
                  />
                );
              }),
            )}
          </div>

          {/* Path line + checkpoints (no pointer events) */}
          <svg width={W} height={H} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="zipline" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
            {path.length > 1 && (
              <polyline
                points={polyPoints}
                fill="none"
                stroke="url(#zipline)"
                strokeWidth={Math.max(6, CELL * 0.34)}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.9}
              />
            )}
            {head && <circle cx={head.x} cy={head.y} r={Math.max(5, CELL * 0.16)} fill="#f59e0b" />}
            {checkpoints.map((cp) => {
              const p = center(cp.r, cp.c);
              return (
                <g key={cp.n}>
                  <circle cx={p.x} cy={p.y} r={CELL * 0.3} fill="#0f1117" stroke="#fff" strokeWidth={2} />
                  <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" fontSize={CELL * 0.34} fontWeight="700" fill="#fff" fontFamily="Space Grotesk, sans-serif">
                    {cp.n}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {message && !solved && <p className="text-xs font-mono opacity-70">{message}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => { setPath([]); setMessage(''); synth.playTargetSound('click'); }}
          className="glass-btn px-4 py-2 text-sm font-display font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {solved && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-display font-bold">
          <Sparkles className="w-5 h-5" /> Solved — every cell covered.
        </div>
      )}
    </div>
  );
}
