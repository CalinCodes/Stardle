import React, { useState, useEffect } from 'react';
import { HelpCircle, RefreshCw, Star, Play, Lightbulb, Dumbbell, Sparkles } from 'lucide-react';
import { RiddleGameData } from '../types';
import { synth } from '../utils/audio';

interface CalibrationRiddleGameProps {
  isInfinite: boolean;
  username: string;
  interests: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function CalibrationRiddleGame({
  isInfinite,
  username,
  interests,
  difficulty,
  onSuccess
}: CalibrationRiddleGameProps) {
  const [riddle, setRiddle] = useState<RiddleGameData | null>(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('Inspect the Calibration Oracle riddle. Enter your single unit word guess.');
  const [loading, setLoading] = useState(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [solveStartTime, setSolveStartTime] = useState<number>(0);
  const [adaptiveFactor, setAdaptiveFactor] = useState<'Normal' | 'Hyper-Abstract' | 'Extreme'>('Normal');

  // Trigger Adaptive Generation during init
  const loadCustomRiddle = async (solveTimeSecs?: number) => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/riddle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: interests && interests.length > 0 ? interests : ["Science", "Space"],
          difficulty,
          averageSecs: solveTimeSecs || 25
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRiddle({
          riddleText: data.riddleText,
          theme: data.theme || 'Universal',
          difficulty: data.difficulty || 'medium',
          clues: ["The oracle demands simplicity.", "Think conceptually about the lines."],
          guesses: [],
          completed: false,
          won: false
        });
        setSolveStartTime(Date.now());
        setFeedback(`The Oracle Sphinx has customized an adaptive riddle aligned with topic and difficulty!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomRiddle();
  }, [difficulty]);

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || !riddle) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/riddle/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          isInfinite,
          activeIndex: 0
        })
      });

      if (res.ok) {
        const result = await res.json();
        const updated = [...guesses, guess.trim()];
        setGuesses(updated);
        setGuess('');
        setFeedback(result.feedback);

        if (result.correct) {
          synth.playTargetSound('win');
          
          // TELEMETRY ADAPTIVE CHECK
          const solveTimeMs = Date.now() - solveStartTime;
          const solveSecs = Math.round(solveTimeMs / 1000);
          
          let alertMsg = `Solved in ${solveSecs} seconds!`;
          if (solveSecs < 15) {
            alertMsg += ` ⚡ SPEEDS DETECTED OUTLET! Calibration oracle automatically increases puzzle abstraction to 'Hyper-Abstract' for your next match!`;
            setAdaptiveFactor('Hyper-Abstract');
          }

          setFeedback(`🏆 CORRECT! ${alertMsg}`);
          onSuccess(Math.max(10, 100 - updated.length * 10), updated.length);
        } else {
          synth.playTargetSound('wrong');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Failed to channel Sphinx. Retry word parameters.');
    } finally {
      setLoading(false);
    }
  };

  const isSolved = feedback.toLowerCase().includes("correct");

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">THE SPHINX CALIBRATION ORACLE</span>
          This adaptive riddle is customized perfectly using your preferred interests and solver telemetry speeds. If you solve this challenge in under 15 seconds, the Oracle automatically recalibrates to generate a significantly abstract, harder puzzle next time!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-display font-medium text-xs tracking-wide">Difficulty Level:</span>
          <span className="font-display font-bold text-xs uppercase bg-yellow-400 text-black px-2 py-0.5">
            {riddle?.difficulty || "Auto-Leveling"}
          </span>
        </div>
        
        <span className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1">
          Adaptive Engine Status: <span className="underline font-bold text-yellow-400">{adaptiveFactor}</span>
        </span>
      </div>

      <div className="retro-card p-5 bg-white rounded-none flex flex-col gap-4">
        {loading && !riddle ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-xs text-stone-500">Oracle is analyzing your lobby profiles...</span>
          </div>
        ) : (
          <>
            <div className="p-5 bg-[#1e1b13] text-white text-center border-2 border-[#1e1b13] font-display text-sm md:text-base leading-relaxed tracking-wide rounded-none relative overflow-hidden">
              <span className="absolute top-2 left-2 text-[8px] font-mono text-yellow-400 tracking-wider">RIDDLE CARD</span>
              "{riddle?.riddleText || 'I walk on four legs in the morning, two at noon, and three in the evening. What am I?'}"
            </div>

            <div className="text-center font-display text-xs text-stone-600 max-w-sm mx-auto leading-relaxed bg-stone-50 py-3 px-4 border border-stone-200 w-full rounded-none">
              {feedback}
            </div>

            {!isSolved && (
              <form onSubmit={submitGuess} className="flex gap-2">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="e.g. Echo, Coffin, Shadow"
                  className="flex-1 px-4 py-3 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-bold border-2 border-[#1e1b13] px-6 py-3 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
                >
                  SOLVE
                </button>
              </form>
            )}

            {isSolved && (
              <button
                type="button"
                onClick={() => {
                  synth.playTargetSound('unlock');
                  loadCustomRiddle(10); // simulate fast solve triggers harder riddle
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-350 text-black font-display font-black border-2 border-[#1e1b13] py-3.5 shadow-[3px_3px_0_#1e1b13] cursor-pointer"
              >
                REQUEST HARDER ADAPTIVE RIDDLE CHALLENGE ⚡
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
