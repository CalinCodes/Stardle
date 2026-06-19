import React, { useState } from 'react';
import { HelpCircle, ChevronRight, RefreshCw, Star, Info, MessageCircle, Volume2 } from 'lucide-react';
import { SemanticGuess } from '../types';
import { synth } from '../utils/audio';

interface SynonymSeekersGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function SynonymSeekersGame({ isInfinite, username, onSuccess }: SynonymSeekersGameProps) {
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<SemanticGuess[]>([]);
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [clueText, setClueText] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState('Type your first guess relative to the target theme above!');

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setGuesses([]);
    setInfiniteIndex(prev => prev + 1);
    setClueText('');
    setHintsUsed(0);
    setFeedback('Loaded fresh hidden word. Guess away!');
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/semantic/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          isInfinite,
          activeIndex: infiniteIndex
        })
      });

      if (res.ok) {
        const result: SemanticGuess = await res.json();
        
        // Check if guess already exists
        if (guesses.some(g => g.word.toLowerCase() === result.word.toLowerCase())) {
          setFeedback(`You already guessed "${result.word}"!`);
          synth.playTargetSound('wrong');
          return;
        }

        const updated = [result, ...guesses];
        // Sort guesses by score descending
        updated.sort((a, b) => b.score - a.score);
        setGuesses(updated);
        setGuess('');

        if (result.status === 'exact') {
          synth.playTargetSound('win');
          setFeedback('🏆 ABSOLUTELY SPOT ON! You discovered the hidden secret word.');
          onSuccess(Math.max(10, 100 - hintsUsed * 10 - updated.length * 2), updated.length);
        } else {
          setFeedback(result.clueFeedback || 'Fascinating. Check the similarity temperature below!');
          if (result.score > 70) {
            synth.playTargetSound('correct');
          } else {
            synth.playTargetSound('click');
          }
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Lost interface with core. Check your logs.');
    } finally {
      setLoading(false);
    }
  };

  // Temperature stylers
  const getTempColor = (status: string) => {
    switch (status) {
      case 'exact':
        return 'bg-yellow-400 text-black border-yellow-500 font-bold';
      case 'hot':
        return 'bg-red-500 text-white border-red-600 font-semibold';
      case 'warm':
        return 'bg-orange-400 text-white border-orange-500';
      case 'cool':
        return 'bg-blue-400 text-white border-blue-500';
      default:
        return 'bg-sky-100 text-sky-900 border-sky-300';
    }
  };

  const getHeatEmoji = (status: string) => {
    switch (status) {
      case 'exact': return '👑';
      case 'hot': return '🔥';
      case 'warm': return '☀️';
      case 'cool': return '❄️';
      default: return '🧊';
    }
  };

  const hasWon = guesses.some(g => g.status === 'exact');

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">SYNONYM SEEKERS MODE</span>
          A secret target word has been chosen. When you enter a guess, Gemini's semantic encoder tells you how close they are in meaning (synonyms, context, concepts) rather than direct alphabetical letters.
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-display font-medium text-xs tracking-wide">Category:</span>
          <span className="font-display font-bold text-xs uppercase bg-yellow-400 text-black px-2 py-0.5">
            {isInfinite ? "Infinite Rotation Science" : "Daily Canopy"}
          </span>
        </div>
        {isInfinite && (
          <button
            onClick={handleNextInfinite}
            className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Skip / Next
          </button>
        )}
      </div>

      {/* Main play canvas */}
      <div className="retro-card p-5 bg-white rounded-none flex flex-col gap-4">
        <div className="text-center py-4 bg-stone-50 border border-stone-200">
          <span className="text-xs uppercase font-mono tracking-widest text-stone-400">Feedback Radar</span>
          <p className="text-sm font-display font-normal text-yellow-950 mt-1 max-w-sm mx-auto leading-relaxed">
            {feedback}
          </p>
        </div>

        {!hasWon && (
          <form onSubmit={submitGuess} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="e.g. Atmosphere"
              className="flex-1 px-4 py-3 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-bold border-2 border-[#1e1b13] px-6 py-3 shadow-[2px_2px_0_#1e1b13] active:translate-y-0.5 active:shadow-0 cursor-pointer transition min-w-[100px]"
            >
              {loading ? "Aligning..." : "SUBMIT"}
            </button>
          </form>
        )}

        {/* Guesses Log */}
        {guesses.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest block mb-1">
              Guess Radar Readings (Best to worst)
            </span>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {guesses.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 border-2 rounded-none flex items-center justify-between shadow-[1px_1px_0_#1e1b13] ${getTempColor(
                    item.status
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getHeatEmoji(item.status)}</span>
                    <span className="font-display font-bold text-sm tracking-tight">{item.word}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs font-bold">
                    <span>{item.score}% Match</span>
                    <span className="text-[10px] uppercase opacity-80 px-1 border border-current">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
