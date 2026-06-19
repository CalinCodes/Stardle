import React, { useEffect, useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  puzzleId: string;
  puzzle: { length: number; maxRows: number; hint: string };
  onSolved: (score: number, guesses: number) => void;
}

interface Tile {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

const tileColor: Record<string, string> = {
  correct: 'bg-green-500 text-white border-green-700',
  present: 'bg-yellow-400 text-black border-yellow-600',
  absent: 'bg-stone-300 text-stone-600 border-stone-500',
};

export default function WordGridGame({ puzzleId, puzzle, onSolved }: Props) {
  const [rows, setRows] = useState<Tile[][]>([]);
  const [current, setCurrent] = useState('');
  const [done, setDone] = useState<'won' | 'lost' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showHint, setShowHint] = useState(false);

  // Reset when a new puzzle arrives.
  useEffect(() => {
    setRows([]);
    setCurrent('');
    setDone(null);
    setMessage('');
    setShowHint(false);
  }, [puzzleId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (done || loading) return;
    if (current.length !== puzzle.length) {
      setMessage(`Enter ${puzzle.length} letters.`);
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/forge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId, guess: current }),
      });
      const data = await res.json();
      if (!data.valid) {
        setMessage(data.message || 'Invalid guess.');
        setLoading(false);
        return;
      }
      const newRows = [...rows, data.result];
      setRows(newRows);
      setCurrent('');
      if (data.solved) {
        setDone('won');
        synth.playTargetSound('win');
        onSolved(Math.max(5, 110 - newRows.length * 20), newRows.length);
      } else if (newRows.length >= puzzle.maxRows) {
        setDone('lost');
        synth.playTargetSound('wrong');
      } else {
        synth.playTargetSound('click');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <button
        onClick={() => setShowHint(true)}
        className="self-start text-xs font-mono text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
      >
        <Lightbulb className="w-3.5 h-3.5" /> {showHint ? puzzle.hint : 'Reveal hint'}
      </button>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: puzzle.maxRows }).map((_, r) => {
          const row = rows[r];
          const isCurrent = r === rows.length && !done;
          return (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: puzzle.length }).map((_, c) => {
                const tile = row?.[c];
                const ch = isCurrent ? current[c] || '' : tile?.letter || '';
                return (
                  <div
                    key={c}
                    className={`w-11 h-11 sm:w-12 sm:h-12 border-2 flex items-center justify-center font-display font-black text-lg uppercase ${
                      tile ? tileColor[tile.status] : 'bg-white border-[#1e1b13]'
                    }`}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {message && <p className="text-xs font-mono text-red-600">{message}</p>}

      {!done && (
        <form onSubmit={submit} className="flex gap-2 w-full max-w-xs">
          <input
            value={current}
            onChange={(e) => setCurrent(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, puzzle.length))}
            placeholder={`${puzzle.length} letters`}
            className="flex-1 px-4 py-3 bg-amber-50/30 border-2 border-[#1e1b13] font-mono text-sm tracking-[0.3em] uppercase focus:outline-none"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-display font-bold border-2 border-[#1e1b13] px-4 py-3 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
          >
            ↵
          </button>
        </form>
      )}

      {done === 'won' && (
        <div className="bg-green-500 text-white border-2 border-green-800 p-3 font-display font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Nice! Solved in {rows.length}.
        </div>
      )}
      {done === 'lost' && (
        <div className="bg-[#1e1b13] text-white border-2 p-3 font-display font-bold">Out of guesses — try a new word!</div>
      )}
    </div>
  );
}
