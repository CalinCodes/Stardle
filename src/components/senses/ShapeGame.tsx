import React, { useEffect, useRef, useState } from 'react';
import { Eye, Check, RotateCcw, Trophy } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  onComplete: (score: number) => void;
}

const ROUNDS = 5;
const GRID = 5;
const SHOW_MS = 2400;

const key = (r: number, c: number) => `${r},${c}`;

function randomPattern(filled: number): Set<string> {
  const all: string[] = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) all.push(key(r, c));
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return new Set(all.slice(0, filled));
}

export default function ShapeGame({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'show' | 'guess' | 'result' | 'done'>('show');
  const [target, setTarget] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [roundScore, setRoundScore] = useState(0);
  const [total, setTotal] = useState(0);
  const timer = useRef<any>(null);

  const newRound = () => {
    const count = 6 + Math.floor(Math.random() * 4); // 6-9 cells
    setTarget(randomPattern(count));
    setPicked(new Set());
    setPhase('show');
    timer.current = setTimeout(() => setPhase('guess'), SHOW_MS);
  };

  useEffect(() => {
    newRound();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (r: number, c: number) => {
    if (phase !== 'guess') return;
    synth.playTargetSound('click');
    setPicked((prev) => {
      const n = new Set(prev);
      const k = key(r, c);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const check = () => {
    // Jaccard similarity → 0..10
    const inter = [...picked].filter((k) => target.has(k)).length;
    const union = new Set([...picked, ...target]).size;
    const jac = union === 0 ? 0 : inter / union;
    // Harsh: filling everything (low overlap) scores 0; need a real match.
    const score = jac < 0.45 ? 0 : Math.round(10 * (jac - 0.45) / 0.55);
    setRoundScore(score);
    setTotal((t) => t + score);
    setPhase('result');
    synth.playTargetSound(score >= 7 ? 'win' : 'click');
  };

  const next = () => {
    if (round + 1 >= ROUNDS) {
      setPhase('done');
      onComplete(total);
      synth.playTargetSound('win');
    } else {
      setRound((r) => r + 1);
      newRound();
    }
  };

  const restart = () => {
    setRound(0);
    setTotal(0);
    newRound();
  };

  const renderGrid = (cells: Set<string>, opts: { interactive?: boolean; compareTo?: Set<string> } = {}) => (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${GRID}, 48px)` }}>
      {Array.from({ length: GRID }).map((_, r) =>
        Array.from({ length: GRID }).map((_, c) => {
          const k = key(r, c);
          const on = cells.has(k);
          let cls = 'bg-white/50 dark:bg-white/5 border-black/25 dark:border-white/20';
          if (opts.compareTo) {
            const want = opts.compareTo.has(k);
            if (on && want) cls = 'bg-emerald-400 border-emerald-600';
            else if (on && !want) cls = 'bg-rose-400 border-rose-600';
            else if (!on && want) cls = 'bg-amber-300/70 border-amber-500';
          } else if (on) {
            cls = 'bg-amber-400 border-amber-600 shadow-[0_0_14px_rgba(245,158,11,0.5)]';
          }
          return (
            <button
              key={k}
              onClick={() => opts.interactive && toggle(r, c)}
              style={{ width: 48, height: 48 }}
              className={`rounded-xl border transition-colors ${cls} ${opts.interactive ? 'cursor-pointer' : ''}`}
            />
          );
        }),
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-between w-full text-xs font-mono opacity-70">
        <span>Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}</span>
        <span>Score {total} / 50</span>
      </div>

      {phase === 'show' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs font-mono opacity-70 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Memorize the pattern…</span>
          {renderGrid(target)}
        </div>
      )}

      {phase === 'guess' && (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <span className="text-xs font-mono opacity-70">Recreate it from memory</span>
          {renderGrid(picked, { interactive: true })}
          <button onClick={check} className="accent-btn px-6 py-3 font-display font-bold flex items-center gap-2 cursor-pointer">
            <Check className="w-4 h-4" /> Check
          </button>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          {renderGrid(picked, { compareTo: target })}
          <span className="text-[10px] font-mono opacity-60">green = correct · red = wrong · amber = missed</span>
          <span className="font-display font-black text-2xl">+{roundScore} <span className="text-sm opacity-60">/ 10</span></span>
          <button onClick={next} className="glass-btn px-5 py-2.5 font-display font-bold cursor-pointer">
            {round + 1 >= ROUNDS ? 'See total' : 'Next pattern'}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Trophy className="w-10 h-10 text-amber-500" />
          <span className="font-display font-black text-3xl">{total} / 50</span>
          <button onClick={restart} className="glass-btn px-5 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        </div>
      )}
    </div>
  );
}
