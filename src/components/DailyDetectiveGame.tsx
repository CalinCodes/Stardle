import React, { useState } from 'react';
import { HelpCircle, RefreshCw, Star, HelpCircle as HelpIcon, Check, Send, AlertTriangle } from 'lucide-react';
import { DetectiveQuestion } from '../types';
import { synth } from '../utils/audio';

interface DailyDetectiveGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

export default function DailyDetectiveGame({ isInfinite, username, onSuccess }: DailyDetectiveGameProps) {
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<DetectiveQuestion[]>([]);
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState('Analyse the murder or mystery setup. What clues can you extract? Ask YES/NO query parameters below.');
  const [loading, setLoading] = useState(false);
  const [solved, setSolved] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);

  const SETUPS = [
    {
      setup: "A man is found dead in a room with only a puddle of water and a locked door. No hanging cables, no weapons or poison present. How did he die?",
      fallbackClues: ["The puddle was originally in a different state.", "Think vertically.", "The room temperature melted something."]
    },
    {
      setup: "A woman buys a brand new pair of shoes, wears them to work, and dies exactly three hours later. Why did she die?",
      fallbackClues: ["Her profession involves sharp Flying projectiles.", "A slight difference in height was fatal.", "She works in a circus entertainment ring."]
    }
  ];

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setQuestions([]);
    setExplanation('');
    setSolved(false);
    setInfiniteIndex(prev => prev + 1);
    setFeedback('New detective mystery file loaded. Initiate YES/NO interrogation.');
  };

  const getActiveSetup = () => {
    return SETUPS[infiniteIndex % SETUPS.length].setup;
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    if (questions.length >= 10) {
      setFeedback('⚠️ Interrogation budget exhausted! You must submit your final Detective explanation now!');
      synth.playTargetSound('wrong');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/games/detective/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          isInfinite,
          activeIndex: infiniteIndex
        })
      });

      if (res.ok) {
        const result = await res.json();
        const newQ: DetectiveQuestion = {
          question: question.trim(),
          answer: result.answer
        };

        synth.playTargetSound('click');
        setQuestions([...questions, newQ]);
        setQuestion('');
        setFeedback(result.remark || `The Game Master replied: "${result.answer}"`);
      }
    } catch (err) {
      console.error(err);
      setFeedback('Interrogator channels distorted. Retry question parameters.');
    } finally {
      setLoading(false);
    }
  };

  const submitSolveAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/games/detective/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanation: explanation.trim(),
          isInfinite,
          activeIndex: infiniteIndex
        })
      });

      if (res.ok) {
        const result = await res.json();
        setFeedback(result.feedback);
        if (result.solved) {
          synth.playTargetSound('win');
          setSolved(true);
          onSuccess(Math.max(20, 150 - questions.length * 15), questions.length);
        } else {
          synth.playTargetSound('wrong');
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Mainframe evaluation error. Check explanation parameters.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <HelpIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">DAILY DETECTIVE CASEFILE</span>
          You are presented with a cryptic murder or strange incident block. Interrogate the AI Game Master. You are allowed exactly 10 free-form questions which can only return YES, NO, or IRRELEVANT. When you're ready, draft your solution!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400 flex items-center gap-1.5 animate-pulse">
          🚨 Active Crime Scene Interrogator
        </span>
        {isInfinite && (
          <button
            onClick={handleNextInfinite}
            className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Skip / Next Case
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* Riddle / Setup display */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <div className="retro-card p-5 bg-stone-900 text-yellow-100 border-2 border-[#1e1b13] shadow-[3px_3px_0_#1e1b13] min-h-[160px] flex flex-col justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#ecc94b] tracking-wider uppercase">Active Mystery Setup</span>
              <p className="font-display font-medium text-sm md:text-base leading-relaxed text-white mt-1">
                "{getActiveSetup()}"
              </p>
            </div>
            <div className="text-[10px] text-stone-400 font-mono text-right mt-3">
              Budget: {10 - questions.length} of 10 questions remaining
            </div>
          </div>

          {/* List of asked questions */}
          <div className="retro-card p-4 bg-white rounded-none flex flex-col gap-3">
            <span className="font-mono text-[9px] text-stone-400 uppercase tracking-widest block border-b pb-1.5">
              Interrogation logs
            </span>
            {questions.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2 font-mono text-center">
                Interrogation room is empty. Ask your first query below!
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={idx} className="flex flex-col gap-1 p-2 bg-stone-50 border border-stone-150 text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-sans text-stone-700">Q: "{q.question}"</span>
                      <span className={`font-mono text-[10px] font-bold px-1 py-0.2 border ${
                        q.answer === 'YES' ? 'bg-green-100 border-green-400 text-green-800' :
                        q.answer === 'NO' ? 'bg-red-100 border-red-400 text-red-800' :
                        'bg-stone-200 border-stone-400 text-stone-700'
                      }`}>
                        {q.answer}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Interrogation panel */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="retro-card p-4 bg-white rounded-none flex flex-col gap-4 h-full justify-between">
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-stone-50 border border-stone-200 text-xs font-mono text-stone-600 leading-relaxed text-center">
                {feedback}
              </div>

              {/* Interrogate Form */}
              {!solved && questions.length < 10 && (
                <form onSubmit={submitQuestion} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] text-stone-400 tracking-wider uppercase block">Ask a Question</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g. Was the water originally solid ice?"
                      className="flex-1 px-3 py-2 bg-amber-50/20 border-2 border-[#1e1b13] font-mono text-xs focus:outline-none focus:bg-yellow-50/40 rounded-none focus:ring-0"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-yellow-400 hover:bg-yellow-350 border-2 border-[#1e1b13] p-2 text-black cursor-pointer shadow-[1px_1px_0_#1e1b13]"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Solve Form */}
              {!solved && (
                <form onSubmit={submitSolveAttempt} className="flex flex-col gap-1.5 border-t-2 border-dashed border-stone-100 pt-3">
                  <span className="font-mono text-[10px] text-amber-800 font-semibold tracking-wider uppercase block">Submit Case Explanation</span>
                  <textarea
                    rows={3}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide your complete deduction on how they died or what happened..."
                    className="w-full p-2.5 bg-yellow-50/5 border-2 border-[#1e1b13] font-sans text-xs focus:outline-none focus:bg-yellow-50/20 rounded-none"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-1 bg-[#1e1b13] hover:bg-stone-800 text-yellow-400 font-display font-bold border-2 border-[#1e1b13] py-2.5 text-xs shadow-[2px_2px_0_#ecc94b]"
                  >
                    SUBMIT VERDICT FOR JUDGMENT
                  </button>
                </form>
              )}

              {solved && (
                <div className="p-4 bg-green-500/10 border-2 border-green-500/60 rounded-none text-center flex flex-col items-center gap-1">
                  <span className="text-xl">🏆 CASE DISMISSED SOLVED!</span>
                  <p className="text-xs font-mono text-green-800">You earned master investigator credentials!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
