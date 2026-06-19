import React, { useState } from 'react';
import { Eye, Check, ChevronRight, HelpCircle, RefreshCw, Star, HelpCircle as HintIcon } from 'lucide-react';
import { PromptGuess } from '../types';
import { synth } from '../utils/audio';

interface PromptDetectiveGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function PromptDetectiveGame({ isInfinite, username, onSuccess }: PromptDetectiveGameProps) {
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<PromptGuess[]>([]);
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState('Inspect the artwork carefully! What key elements were requested to generate it? Try describing characters, actions, or meals.');

  const PRESET_HINTS = [
    "Look and think: Is that character real on Earth, or does he wear professional void gear?",
    "Check what he is riding, and what long noodle food is sitting on his plate!",
    "Full original description details: 'vintage astronaut eating spaghetti on a bicycle'"
  ];

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setGuesses([]);
    setInfiniteIndex(prev => prev + 1);
    setHintLevel(0);
    setFeedback('Loaded fresh image artifact. Good deciphering luck!');
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/prompt/guess', {
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
        const newGuess: PromptGuess = {
          text: guess.trim(),
          similarity: result.similarity,
          feedback: result.feedback
        };

        const updated = [newGuess, ...guesses];
        setGuesses(updated);
        setGuess('');
        setFeedback(result.feedback);

        if (result.isCorrect || result.similarity >= 85) {
          synth.playTargetSound('win');
          onSuccess(Math.max(15, 120 - updated.length * 5 - hintLevel * 15), updated.length);
        } else {
          synth.playTargetSound('click');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Lost connection to the decoder mainframe. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Preset assets depending on infinite index
  const getImageSource = () => {
    const images = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80", // Space abstract
      "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&auto=format&fit=crop&q=80", // Neon Tokyo cyberpunk
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80", // Red panda
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&auto=format&fit=crop&q=80"  // Golden watch clockwork
    ];
    return images[infiniteIndex % images.length];
  };

  const getThemeText = () => {
    const titles = [
      "Retro Explorations & Italian Food",
      "Sights of Neo Tokyo rainy streets",
      "Cozy Forest Animal reading novels",
      "Antique Gears and High Altitude Spire"
    ];
    return titles[infiniteIndex % titles.length];
  };

  const triggerHint = () => {
    synth.playTargetSound('click');
    if (hintLevel < PRESET_HINTS.length) {
      setFeedback(`🔍 Clue Level ${hintLevel + 1}: ${PRESET_HINTS[hintLevel]}`);
      setHintLevel(prev => prev + 1);
    } else {
      setFeedback("That's all the clearance you have! Guess what's in the picture.");
    }
  };

  const isCompleted = guesses.some(g => g.similarity >= 85);

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <HintIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">PROMPT DETECTIVE MAIN BOARD</span>
          This surreal digital masterpiece was generated using an AI prompt engine of precise keywords. Describe the artwork describing major characters, vehicles, meals, and actions!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-display font-medium text-xs tracking-wide">Vibe:</span>
          <span className="font-display font-bold text-xs uppercase bg-yellow-400 text-black px-2 py-0.5">
            {getThemeText()}
          </span>
        </div>
        {isInfinite && (
          <button
            onClick={handleNextInfinite}
            className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Skip / Next Image
          </button>
        )}
      </div>

      {/* Main artwork card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="retro-card bg-stone-900 border-2 border-[#1e1b13] relative overflow-hidden flex items-center justify-center p-2 min-h-[300px]">
          <img
            src={getImageSource()}
            alt="Prompt Detective generator illustration"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover border border-stone-800 yellow-glow"
          />
          <div className="absolute bottom-3 left-3 bg-[#1e1b13] text-white text-[10px] font-mono px-2 py-1 uppercase tracking-wider">
            Generated Asset
          </div>
        </div>

        <div className="retro-card p-5 bg-white rounded-none flex flex-col gap-4">
          <div className="text-center py-3 bg-stone-50 border border-stone-100 rounded-none">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-400 block mb-1">
              Decoding Telemetry feedback
            </span>
            <p className="text-xs font-display text-yellow-950 leading-relaxed max-w-sm mx-auto">
              {feedback}
            </p>
          </div>

          {!isCompleted && (
            <div className="flex flex-col gap-2">
              <form onSubmit={submitGuess} className="flex gap-2">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="e.g. vintage astronaut riding a bicycle"
                  className="flex-1 px-3 py-2.5 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-xs focus:outline-none focus:bg-yellow-50/40 rounded-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-bold border-2 border-[#1e1b13] px-4 py-2 text-xs shadow-[2px_2px_0_#1e1b13]"
                >
                  {loading ? 'ANALYZING...' : 'DECYPHER'}
                </button>
              </form>

              <button
                type="button"
                onClick={triggerHint}
                className="text-left text-[11px] font-mono text-amber-700 hover:text-amber-800 mt-1"
              >
                ❔ Stuck? Reveal dynamic conceptual clue ({hintLevel}/3 used)
              </button>
            </div>
          )}

          {/* Prompt similarity tracking logs */}
          {guesses.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="font-mono text-[9px] text-stone-400 uppercase tracking-widest block mb-1">
                Scoring attempts logs
              </span>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                {guesses.map((item, idx) => (
                  <div key={idx} className="p-2 border border-[#1e1b13] bg-stone-50 rounded-none flex flex-col gap-1 shadow-[1px_1px_0_#1e1b13]">
                    <div className="flex justify-between font-mono font-bold text-[10px] border-b border-stone-200 pb-1">
                      <span className="text-[#1e1b13] truncate max-w-xs capitalize">"{item.text}"</span>
                      <span className={`${item.similarity >= 85 ? 'text-green-700' : 'text-amber-600'}`}>
                        {item.similarity}% match
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-stone-500 font-sans italic">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
