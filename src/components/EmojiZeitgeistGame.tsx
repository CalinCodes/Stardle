import React, { useState } from 'react';
import { HelpCircle, RefreshCw, Star, ArrowRight, Zap, Info } from 'lucide-react';
import { synth } from '../utils/audio';

interface EmojiZeitgeistGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function EmojiZeitgeistGame({ isInfinite, username, onSuccess }: EmojiZeitgeistGameProps) {
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('Analyse the emoji combinations. Do they represent cinema blockbusters, major historic timelines, or futuristic silicon devices?');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);

  const EMOJI_SETS = [
    { emojis: ["🍿", "🦖", "🤠", "🌋", "🗺️"], clues: ["An archaeological adventure on a secluded island.", "Features clone prehistoric reptiles.", "Directed by Steven Spielberg."] },
    { emojis: ["🚀", "🌕", "👨‍🚀", "🇺🇸", "📅"], clues: ["A historic voyage into the unknown space.", "Neil Armstrong declared a giant leap here.", "Staged in Year 1969."] },
    { emojis: ["🎸", "👩‍🎤", "🎤", "🎟️", "💰"], clues: ["A high demand concert show series.", "Spans across various artistic albums or 'Eras'.", "Associated with a prominent pop star singer."] }
  ];

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setAttempts([]);
    setInfiniteIndex(prev => prev + 1);
    setHintLevel(0);
    setFeedback('Loaded fresh trending emoji puzzle. Good translation!');
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/zeitgeist/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          isInfinite,
          activeIndex: infiniteIndex
        })
      });

      if (res.ok) {
        const result = await res.json();
        const updated = [...attempts, guess.trim()];
        setAttempts(updated);
        setGuess('');
        setFeedback(result.feedback);

        if (result.correct) {
          synth.playTargetSound('win');
          onSuccess(Math.max(10, 100 - updated.length * 10 - hintLevel * 10), updated.length);
        } else {
          synth.playTargetSound('wrong');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error checking trend coordinates. Restructuring.');
    } finally {
      setLoading(false);
    }
  };

  const getActiveEmojis = () => {
    return EMOJI_SETS[infiniteIndex % EMOJI_SETS.length].emojis;
  };

  const triggerClue = () => {
    synth.playTargetSound('click');
    const set = EMOJI_SETS[infiniteIndex % EMOJI_SETS.length];
    if (hintLevel < set.clues.length) {
      setFeedback(`🔍 Clue: ${set.clues[hintLevel]}`);
      setHintLevel(prev => prev + 1);
    } else {
      setFeedback("No more daily intelligence clearance! Input your best estimate.");
    }
  };

  const isSolved = feedback.toLowerCase().includes("correct") || feedback.toLowerCase().includes("nailed");

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">EMOJI ZEITGEIST (THE TREND TRANSLATOR)</span>
          Pop culture moves quickly. These 5 emojis symbolize a trending news, entertainment milestone, gadget, or historical block. Type what piece of media or event they are pointing to!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          Decrypting Pop Culture Channels
        </span>
        {isInfinite && (
          <button
            onClick={handleNextInfinite}
            className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Skip / Next Trend
          </button>
        )}
      </div>

      <div className="retro-card p-6 bg-white rounded-none flex flex-col items-center gap-5">
        {/* Large visual emojis */}
        <div className="flex justify-center gap-3 p-4 bg-amber-500/5 border-2 border-[#1e1b13] shadow-[3px_3px_0_#1e1b13] w-full max-w-sm relative overflow-hidden">
          {getActiveEmojis().map((emoji, idx) => (
            <span key={idx} className="text-4xl filter drop-shadow animate-pulse select-none" style={{ animationDelay: `${idx * 150}ms` }}>
              {emoji}
            </span>
          ))}
          <div className="absolute top-0 right-0 bg-[#1e1b13] text-white text-[8px] font-mono px-1 py-0.5 uppercase">
            TREND #03
          </div>
        </div>

        {/* Feedback display */}
        <div className="text-center font-display text-sm text-[#1e1b13] max-w-sm mt-2 leading-relaxed bg-stone-50 py-3 px-4 border border-stone-200 w-full">
          {feedback}
        </div>

        {!isSolved && (
          <div className="w-full max-w-md flex flex-col gap-2">
            <form onSubmit={submitGuess} className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="e.g. Jurassic Park"
                className="flex-1 px-4 py-3 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-bold border-2 border-[#1e1b13] px-5 py-3 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
              >
                {loading ? 'CHECKING...' : 'TRANSLATE'}
              </button>
            </form>

            <button
              type="button"
              onClick={triggerClue}
              className="text-left text-[11px] font-mono text-amber-700 hover:text-amber-800"
            >
              ❔ Request cultural clue hint ({hintLevel}/3 used)
            </button>
          </div>
        )}

        {/* Previous guessing records */}
        {attempts.length > 0 && (
          <div className="w-full max-w-md mt-1">
            <span className="font-mono text-[9px] text-stone-400 uppercase tracking-widest block mb-1">Guesses History</span>
            <div className="flex flex-wrap gap-1.5">
              {attempts.map((val, idx) => (
                <span key={idx} className="px-2 py-1 border border-stone-300 bg-stone-50 font-mono text-[10px] text-stone-500">
                  {val}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
