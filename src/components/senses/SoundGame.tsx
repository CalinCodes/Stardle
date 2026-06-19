import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Check, RotateCcw, Trophy, Play } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  onComplete: (score: number) => void;
}

const ROUNDS = 5;
const MIN_F = 220;
const MAX_F = 880;

export default function SoundGame({ onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'play' | 'result' | 'done'>('play');
  const [target, setTarget] = useState(440);
  const [guessF, setGuessF] = useState(440);
  const [heardTarget, setHeardTarget] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [total, setTotal] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const newRound = () => {
    setTarget(Math.round(MIN_F + Math.random() * (MAX_F - MIN_F)));
    setGuessF(440);
    setHeardTarget(false);
    setPhase('play');
  };

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tone = (freq: number, ms = 900) => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch {}
  };

  const lockIn = () => {
    const cents = Math.abs(1200 * Math.log2(guessF / target));
    // Harsh: must be within ~2.5 semitones; beyond 250 cents scores 0.
    const score = cents > 250 ? 0 : Math.round(10 * (1 - cents / 250));
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

      {phase === 'play' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm animate-fade-in">
          <button
            onClick={() => { tone(target); setHeardTarget(true); }}
            className="accent-btn px-6 py-3 font-display font-bold flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" /> Play the tone
          </button>

          {heardTarget && (
            <>
              <div className="w-full flex flex-col gap-1">
                <span className="text-[11px] font-mono opacity-70 flex justify-between">
                  <span>Match the pitch</span><span>{guessF} Hz</span>
                </span>
                <input
                  type="range" min={MIN_F} max={MAX_F} value={guessF}
                  onChange={(e) => setGuessF(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: '#f59e0b' }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => tone(guessF)} className="glass-btn px-4 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
                  <Volume2 className="w-4 h-4" /> Hear mine
                </button>
                <button onClick={lockIn} className="accent-btn px-5 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
                  <Check className="w-4 h-4" /> Lock in
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <span className="font-display font-black text-2xl">+{roundScore} <span className="text-sm opacity-60">/ 10</span></span>
          <span className="text-xs font-mono opacity-70">target {target} Hz · you {guessF} Hz</span>
          <button onClick={next} className="glass-btn px-5 py-2.5 font-display font-bold cursor-pointer">
            {round + 1 >= ROUNDS ? 'See total' : 'Next tone'}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Trophy className="w-10 h-10 text-amber-500" />
          <span className="font-display font-black text-3xl">{total} / 50</span>
          <span className="text-xs font-mono opacity-70">{total >= 40 ? 'Golden ears!' : total >= 25 ? 'Good ear.' : 'Keep listening!'}</span>
          <button onClick={restart} className="glass-btn px-5 py-2.5 font-display font-bold flex items-center gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
        </div>
      )}
    </div>
  );
}
