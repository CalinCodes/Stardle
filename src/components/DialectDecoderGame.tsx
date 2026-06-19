import React, { useState } from 'react';
import { HelpCircle, RefreshCw, Star, MessageSquare } from 'lucide-react';
import { synth } from '../utils/audio';

interface DialectDecoderProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function DialectDecoderGame({ isInfinite, username, onSuccess }: DialectDecoderProps) {
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('Read the stylized plot and guess the subject.');
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [currentPlot, setCurrentPlot] = useState<{style: string, text: string} | null>(null);
  const [puzzleId, setPuzzleId] = useState('');
  const [dealClosed, setDealClosed] = useState(false);

  const loadPlot = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/dialect/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPlot({ style: data.style, text: data.text });
        setPuzzleId(data.id);
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error loading transmission.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadPlot();
  }, [infiniteIndex]);

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setAttempts([]);
    setGuess('');
    setDealClosed(false);
    setInfiniteIndex(prev => prev + 1);
    setFeedback('New frequency tuned in.');
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || dealClosed) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/dialect/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          puzzleId,
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
          setDealClosed(true);
          onSuccess(Math.max(5, 100 - updated.length * 20), updated.length);
        } else {
          synth.playTargetSound('wrong');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error verifying translation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">DIALECT DECODER (THE STYLIZED PLOT)</span>
          A famous movie plot, historical event, or concept has been rewritten in an incredibly bizarre voice. Guess what the actual subject is!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400">
          Listening to Channel
        </span>
        <button onClick={handleNextInfinite} className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Skip / Next Plot
        </button>
      </div>

      <div className="retro-card p-5 bg-white rounded-none flex flex-col items-center gap-4">
        {loading && !currentPlot ? (
          <div className="p-8 font-mono text-xs animate-pulse text-stone-500">Connecting to transmission...</div>
        ) : currentPlot ? (
          <div className="w-full flex flex-col gap-3">
            <div className="p-4 bg-stone-900 text-yellow-100 border-2 border-[#1e1b13] shadow-[3px_3px_0_#1e1b13] flex flex-col gap-2 relative">
               <span className="text-[9px] font-mono uppercase text-yellow-500 tracking-widest block mb-1">
                 Speaker Style: {currentPlot.style}
               </span>
               <p className="font-display text-sm leading-relaxed italic text-white md:text-base">
                 "{currentPlot.text}"
               </p>
            </div>

            <div className="text-center font-display text-xs text-stone-600 leading-relaxed bg-stone-50 py-3 px-4 border border-stone-200 mt-2">
              {feedback}
            </div>

            {!dealClosed && (
              <form onSubmit={submitGuess} className="flex gap-2">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="e.g. Jurassic Park, Using a Toaster..."
                  className="flex-1 px-4 py-3 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-black border-2 border-[#1e1b13] px-6 shadow-[2px_2px_0_#1e1b13]"
                >
                  TRANSLATE
                </button>
              </form>
            )}

            {attempts.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="font-mono text-[9px] text-stone-400 uppercase tracking-widest w-full">Guesses History</span>
                {attempts.map((val, idx) => (
                  <span key={idx} className="px-2 py-1 border border-stone-300 bg-stone-50 font-mono text-[10px] text-stone-500">
                    {val}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
