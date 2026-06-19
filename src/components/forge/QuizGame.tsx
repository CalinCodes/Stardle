import React, { useEffect, useState } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  puzzleId: string;
  puzzle: {
    kind: 'progressive' | 'multiple_choice' | 'odd_one_out' | 'sequence';
    title: string;
    question: string;
    clues: string[];
    options: string[];
  };
  onSolved: (score: number, guesses: number) => void;
}

export default function QuizGame({ puzzleId, puzzle, onSolved }: Props) {
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [solved, setSolved] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGuess('');
    setAttempts(0);
    setRevealedClues(1);
    setSolved(false);
    setExplanation('');
    setMessage('');
  }, [puzzleId]);

  const isChoice = puzzle.kind === 'multiple_choice' || puzzle.kind === 'odd_one_out';

  const send = async (value: string) => {
    if (!value.trim() || solved || loading) return;
    setLoading(true);
    setMessage('');
    const n = attempts + 1;
    setAttempts(n);
    try {
      const res = await fetch('/api/forge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId, guess: value.trim() }),
      });
      const data = await res.json();
      if (data.solved) {
        setSolved(true);
        setExplanation(data.explanation || '');
        synth.playTargetSound('win');
        onSolved(Math.max(5, 100 - (n - 1) * 30 - (revealedClues - 1) * 12), n);
      } else {
        setMessage('Not quite — try again.');
        synth.playTargetSound('wrong');
        if (puzzle.kind === 'progressive' && revealedClues < puzzle.clues.length) {
          setRevealedClues((c) => c + 1);
        }
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setLoading(false);
      setGuess('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="retro-card p-4 bg-white">
        <div className="font-display font-black text-sm text-yellow-950 mb-1">{puzzle.title}</div>
        <p className="text-sm font-sans text-stone-800 leading-relaxed">{puzzle.question}</p>
      </div>

      {/* Progressive clues */}
      {puzzle.kind === 'progressive' && (
        <div className="flex flex-col gap-1.5">
          {puzzle.clues.slice(0, revealedClues).map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono bg-yellow-400/10 border border-stone-300 p-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      {isChoice && !solved && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {puzzle.options.map((opt) => (
            <button
              key={opt}
              onClick={() => send(opt)}
              disabled={loading}
              className="px-4 py-3 bg-white border-2 border-[#1e1b13] font-display font-bold text-sm text-left hover:bg-yellow-200 cursor-pointer shadow-[2px_2px_0_#1e1b13]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Free text (progressive / sequence) */}
      {!isChoice && !solved && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(guess);
          }}
          className="flex gap-2"
        >
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Your answer…"
            className="flex-1 px-4 py-3 bg-amber-50/30 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-display font-bold border-2 border-[#1e1b13] px-5 py-3 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
          >
            {loading ? '…' : 'ANSWER'}
          </button>
        </form>
      )}

      {message && <p className="text-xs font-mono text-red-600">{message}</p>}

      {solved && (
        <div className="bg-green-500 text-white border-2 border-green-800 p-4 font-display font-bold flex flex-col gap-1 shadow-[3px_3px_0_#14532d]">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Correct in {attempts} {attempts === 1 ? 'try' : 'tries'}!
          </span>
          {explanation && <span className="font-mono text-xs font-normal opacity-90">{explanation}</span>}
        </div>
      )}
    </div>
  );
}
