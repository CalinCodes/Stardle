import React, { useState } from 'react';
import { RefreshCw, Link as LinkIcon, PenTool } from 'lucide-react';
import { synth } from '../utils/audio';

interface MissingLinkGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function MissingLinkGame({ isInfinite, username, onSuccess }: MissingLinkGameProps) {
  const [sentence, setSentence] = useState('');
  const [feedback, setFeedback] = useState('Write a single, cohesive, logically sound sentence connecting the two concepts.');
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [currentWords, setCurrentWords] = useState<{wordA: string, wordB: string} | null>(null);
  const [dealClosed, setDealClosed] = useState(false);
  const [scoreObj, setScoreObj] = useState<{score: number, explanation: string} | null>(null);

  const loadWords = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/missinglink/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentWords({ wordA: data.wordA, wordB: data.wordB });
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error loading words.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadWords();
  }, [infiniteIndex]);

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setDealClosed(false);
    setSentence('');
    setScoreObj(null);
    setInfiniteIndex(prev => prev + 1);
    setFeedback('New concepts loaded. Find the link!');
  };

  const submitSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentence.trim() || dealClosed) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/missinglink/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: sentence.trim(),
          wordA: currentWords?.wordA,
          wordB: currentWords?.wordB,
        })
      });

      if (res.ok) {
        const result = await res.json();
        setScoreObj({ score: result.score, explanation: result.explanation });
        
        if (result.score >= 70) {
          synth.playTargetSound('win');
          setFeedback('Valid connection accepted!');
          setDealClosed(true);
          onSuccess(result.score, 1);
        } else {
          synth.playTargetSound('wrong');
          setFeedback('Connection rejected. Too weak or illogical. Try again.');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Error evaluating the semantic link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <LinkIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">THE MISSING LINK (CONTEXTUAL CONNECTIONS)</span>
          You are given two completely unrelated words. Write a single, cohesive, logically sound sentence that connects the two concepts. The AI will referee your grammar and logical flow!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400">
          Semantic Bridge Builder
        </span>
        <button onClick={handleNextInfinite} className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Skip / Next Words
        </button>
      </div>

      <div className="retro-card p-5 bg-white rounded-none flex flex-col items-center gap-6">
        {loading && !currentWords ? (
          <div className="p-8 font-mono text-xs animate-pulse text-stone-500">Extracting random concepts...</div>
        ) : currentWords ? (
          <div className="w-full flex flex-col gap-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 bg-stone-900 border-2 border-[#1e1b13] shadow-[3px_3px_0_#1e1b13]">
               <span className="font-display text-lg font-black text-yellow-400 uppercase tracking-widest text-center">
                 {currentWords.wordA}
               </span>
               <LinkIcon className="w-6 h-6 text-stone-500" />
               <span className="font-display text-lg font-black text-yellow-400 uppercase tracking-widest text-center">
                 {currentWords.wordB}
               </span>
            </div>

            <div className="text-center font-display text-xs text-stone-600 leading-relaxed bg-stone-50 py-3 px-4 border border-stone-200">
              {feedback}
            </div>

            {!dealClosed && (
              <form onSubmit={submitSentence} className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder={`Write a single sentence containing both "${currentWords.wordA}" and "${currentWords.wordB}" logically...`}
                  className="w-full p-3 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-xs focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-yellow-400 hover:bg-yellow-350 text-black font-display font-black border-2 border-[#1e1b13] py-3 shadow-[2px_2px_0_#1e1b13]"
                >
                  {loading ? 'EVALUATING...' : 'SUBMIT BRIDGE'}
                </button>
              </form>
            )}

            {scoreObj && (
              <div className="p-4 border-2 border-[#1e1b13] bg-stone-50 flex flex-col gap-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    Gemini Evaluation
                  </span>
                  <span className={`font-display font-black text-sm ${scoreObj.score >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                    SCORE: {scoreObj.score}/100
                  </span>
                </div>
                <p className="font-sans text-xs leading-relaxed text-stone-700 italic">
                  "{scoreObj.explanation}"
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
