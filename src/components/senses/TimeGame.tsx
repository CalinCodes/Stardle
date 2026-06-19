import React, { useEffect, useRef, useState } from 'react';
import { Eye, RotateCcw, Trophy, Timer } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  onComplete: (score: number) => void;
}

const ROUNDS = 5;

export default function TimeGame({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'reproduce' | 'holding' | 'result' | 'done'>('idle');
  const [target, setTarget] = useState(1500);
  const [held, setHeld] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [total, setTotal] = useState(0);
  const startRef = useRef(0);
  const timer = useRef<any>(null);

  const newRound = () => {
    setTarget(Math.round(800 + Math.random() * 2400));
    setHeld(0);
    setPhase('idle');
  };

  useEffect(() => {
    newRound();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watch = () => {
    setPhase('showing');
    timer.current = setTimeout(() => setPhase('reproduce'), target);
  };

  const down = () => {
    if (phase !== 'reproduce') return;
    startRef.current = performance.now();
    setPhase('holding');
  };

  const up = () => {
    if (phase !== 'holding') return;
    const ms = performance.now() - startRef.current;
    setHeld(ms);
    const err = Math.abs(ms - target) / target;
    // Harsh: more than 35% off the target duration scores 0.
    const score = err > 0.35 ? 0 : Math.round(10 * (1 - err / 0.35));
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

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-between w-full text-xs font-mono opacity-70">
        <span>Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}</span>
        <span>Score {total} / 50</span>
      </div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs font-mono opacity-70 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Watch the duration, then reproduce it</span>
          <button onClick={watch} className="accent-btn px-6 py-3 font-display font-bold flex items-center gap-2 cursor-pointer">
            <Timer className="w-4 h-4" /> Show duration
          </button>
        </div>
      )}

      {phase === 'showing' && (
        <div className="w-48 h-48 rounded-3xl shadow-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }} />
      )}

      {(phase === 'reproduce' || phase === 'holding') && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs font-mono opacity-70">Press and hold for the SAME duration</span>
          <button
            onPointerDown={down}
            onPointerUp={up}
            onPointerLeave={up}
            className={`w-48 h-48 rounded-3xl font-display font-black text-lg cursor-pointer select-none transition-transform ${
              phase === 'holding'
                ? 'scale-95 text-white'
                : 'glass-strong'
            }`}
            style={phase === 'holding' ? { background: 'linear-gradient(135deg,#f59e0b,#eab308)' } : {}}
          >
            {phase === 'holding' ? 'HOLDING…' : 'HOLD ME'}
          </button>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="font-display font-black text-2xl">+{roundScore} <span className="text-sm opacity-60">/ 10</span></span>
          <span className="text-xs font-mono opacity-70">target {(target / 1000).toFixed(2)}s · you {(held / 1000).toFixed(2)}s</span>
          <button onClick={next} className="glass-btn px-5 py-2.5 font-display font-bold cursor-pointer">
            {round + 1 >= ROUNDS ? 'See total' : 'Next duration'}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Trophy className="w-10 h-10 text-amber-500" />
          <span className="font-display font-black text-3xl">{total} / 50</span>
          <span className="text-xs font-mono opacity-70">{total >= 40 ? 'Human stopwatch!' : total >= 25 ? 'Good internal clock.' : 'Keep counting!'}</span>
          <button onClick={restart} className="glass-btn px-5 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        </div>
      )}
    </div>
  );
}
