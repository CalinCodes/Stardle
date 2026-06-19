import React, { useState } from 'react';
import { RefreshCw, SearchX, ShieldAlert } from 'lucide-react';
import { synth } from '../utils/audio';

interface HallucinationGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function HallucinationGame({ isInfinite, username, onSuccess }: HallucinationGameProps) {
  const [feedback, setFeedback] = useState('Read the 4 facts carefully. Tap the one that is a complete lie.');
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<{topic: string, facts: string[], fakeIndex: number} | null>(null);
  const [dealClosed, setDealClosed] = useState(false);

  const loadFacts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/hallucination/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInfinite, activeIndex: infiniteIndex })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentLevel(data);
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error loading trivia block.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadFacts();
  }, [infiniteIndex]);

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setDealClosed(false);
    setInfiniteIndex(prev => prev + 1);
    setFeedback('New facts loaded. Spot the hallucination!');
  };

  const selectFact = (index: number) => {
    if (dealClosed || !currentLevel) return;
    
    if (index === currentLevel.fakeIndex) {
      synth.playTargetSound('win');
      setFeedback('CORRECT! That was a complete AI hallucination.');
      setDealClosed(true);
      onSuccess(100, 1);
    } else {
      synth.playTargetSound('wrong');
      setFeedback('INCORRECT! That fact is actually completely true. The AI fooled you!');
      setDealClosed(true);
      onSuccess(0, 1);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">SPOT THE HALLUCINATION (FACT OR FIB)</span>
          Three of these highly specific facts are completely true. One is a highly convincing "hallucination" crafted by the AI. Find the lie!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400">
          Fact Checker Engine
        </span>
        {isInfinite && (
          <button onClick={handleNextInfinite} className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Skip / Next Trivia
          </button>
        )}
      </div>

      <div className="retro-card p-5 bg-white rounded-none flex flex-col items-center gap-4">
        {loading && !currentLevel ? (
          <div className="p-8 font-mono text-xs animate-pulse text-stone-500">Generating deceptive trivia...</div>
        ) : currentLevel ? (
          <div className="w-full flex flex-col gap-4">
            <div className="text-center font-display text-sm font-bold text-stone-800 bg-stone-100 py-2 border-b-2 border-stone-200">
              Topic: {currentLevel.topic}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentLevel.facts.map((fact, idx) => {
                let btnStyle = "bg-white hover:bg-stone-50 border-stone-300 shadow-[2px_2px_0_#1e1b13]";
                if (dealClosed) {
                  if (idx === currentLevel.fakeIndex) {
                    btnStyle = "bg-red-500 text-white border-red-700 shadow-[2px_2px_0_#b91c1c]";
                  } else {
                    btnStyle = "bg-green-50 text-green-900 border-green-300 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={dealClosed}
                    onClick={() => selectFact(idx)}
                    className={`cursor-pointer border-2 p-4 text-left font-sans text-xs leading-relaxed transition ${btnStyle}`}
                  >
                    {fact}
                  </button>
                )
              })}
            </div>

            <div className="text-center font-display text-xs text-stone-800 font-bold bg-amber-50 py-3 px-4 border border-amber-200 mt-2">
              {feedback}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
