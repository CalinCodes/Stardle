import React, { useEffect, useRef, useState } from 'react';
import { Eye, Check, RotateCcw, Trophy } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  onComplete: (score: number) => void;
}

const ROUNDS = 5;
const SHOW_MS = 2600;

function hsbToCss(h: number, s: number, b: number) {
  return `hsl(${h}, ${s}%, ${b}%)`;
}

// Perceptual-ish distance across hue (circular), saturation and brightness → 0..1
function colorError(a: [number, number, number], g: [number, number, number]) {
  const dh = Math.min(Math.abs(a[0] - g[0]), 360 - Math.abs(a[0] - g[0])) / 180;
  const ds = Math.abs(a[1] - g[1]) / 100;
  const db = Math.abs(a[2] - g[2]) / 100;
  return (dh * 0.5 + ds * 0.25 + db * 0.25);
}

export default function ColorGame({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'show' | 'guess' | 'result' | 'done'>('show');
  const [target, setTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [h, setH] = useState(180);
  const [s, setS] = useState(50);
  const [b, setB] = useState(50);
  const [roundScore, setRoundScore] = useState(0);
  const [total, setTotal] = useState(0);
  const timer = useRef<any>(null);

  const newTarget = () => {
    const t: [number, number, number] = [
      Math.floor(Math.random() * 360),
      Math.floor(40 + Math.random() * 60),
      Math.floor(35 + Math.random() * 55),
    ];
    setTarget(t);
    setPhase('show');
    setH(180);
    setS(50);
    setB(50);
    timer.current = setTimeout(() => setPhase('guess'), SHOW_MS);
  };

  useEffect(() => {
    newTarget();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockIn = () => {
    const err = colorError(target, [h, s, b]);
    // Harsh: only genuinely close colours score; ~32%+ error earns nothing.
    const score = err >= 0.32 ? 0 : Math.round(10 * (1 - err / 0.32));
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
      newTarget();
    }
  };

  const restart = () => {
    setRound(0);
    setTotal(0);
    newTarget();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-between w-full text-xs font-mono opacity-70">
        <span>Round {Math.min(round + 1, ROUNDS)} / {ROUNDS}</span>
        <span>Score {total} / 50</span>
      </div>

      {phase === 'show' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="text-xs font-mono opacity-70 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Memorize this colour…</span>
          <div className="w-48 h-48 rounded-3xl shadow-2xl" style={{ background: hsbToCss(target[0], target[1], target[2]) }} />
        </div>
      )}

      {phase === 'guess' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm animate-fade-in">
          <div className="w-40 h-40 rounded-3xl shadow-2xl border border-white/40" style={{ background: hsbToCss(h, s, b) }} />
          <Slider label="Hue" value={h} min={0} max={360} onChange={setH} accent={hsbToCss(h, 90, 50)} />
          <Slider label="Saturation" value={s} min={0} max={100} onChange={setS} accent={hsbToCss(h, s, 50)} />
          <Slider label="Brightness" value={b} min={0} max={100} onChange={setB} accent={hsbToCss(h, 60, b)} />
          <button onClick={lockIn} className="accent-btn px-6 py-3 font-display font-bold flex items-center gap-2 cursor-pointer">
            <Check className="w-4 h-4" /> Lock in
          </button>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex gap-3 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-24 h-24 rounded-2xl shadow-lg" style={{ background: hsbToCss(target[0], target[1], target[2]) }} />
              <span className="text-[10px] font-mono opacity-60">target</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-24 h-24 rounded-2xl shadow-lg" style={{ background: hsbToCss(h, s, b) }} />
              <span className="text-[10px] font-mono opacity-60">yours</span>
            </div>
          </div>
          <span className="font-display font-black text-2xl">+{roundScore} <span className="text-sm opacity-60">/ 10</span></span>
          <button onClick={next} className="glass-btn px-5 py-2.5 font-display font-bold cursor-pointer">
            {round + 1 >= ROUNDS ? 'See total' : 'Next colour'}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Trophy className="w-10 h-10 text-amber-500" />
          <span className="font-display font-black text-3xl">{total} / 50</span>
          <span className="text-xs font-mono opacity-70">{total >= 40 ? 'Incredible colour memory!' : total >= 25 ? 'Solid eye.' : 'Keep training your eye!'}</span>
          <button onClick={restart} className="glass-btn px-5 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, onChange, accent }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <label className="w-full flex flex-col gap-1">
      <span className="text-[11px] font-mono opacity-70 flex justify-between"><span>{label}</span><span>{value}</span></span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-current"
        style={{ accentColor: accent }}
      />
    </label>
  );
}
