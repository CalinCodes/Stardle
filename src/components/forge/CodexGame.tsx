import React, { useMemo, useState } from 'react';
import { Check, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Attribute {
  key: string;
  label: string;
  type: 'text' | 'number';
}

interface CodexRow {
  name: string;
  comparison: {
    key: string;
    label: string;
    value: any;
    status: 'match' | 'partial' | 'miss';
    direction: 'up' | 'down' | 'equal';
  }[];
}

interface Props {
  puzzleId: string;
  puzzle: { attributes: Attribute[]; entityNames: string[] };
  onSolved: (score: number, guesses: number) => void;
}

const cellColor: Record<string, string> = {
  match: 'bg-green-500 text-white border-green-700',
  partial: 'bg-yellow-400 text-black border-yellow-600',
  miss: 'bg-stone-200 text-stone-600 border-stone-400',
};

export default function CodexGame({ puzzleId, puzzle, onSolved }: Props) {
  const [guess, setGuess] = useState('');
  const [rows, setRows] = useState<CodexRow[]>([]);
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const remaining = useMemo(() => {
    const used = new Set(rows.map((r) => r.name.toLowerCase()));
    return puzzle.entityNames.filter((n) => !used.has(n.toLowerCase()));
  }, [rows, puzzle.entityNames]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || solved) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/forge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId, guess: guess.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        setMessage(data.message || 'Pick a name from the set.');
        synth.playTargetSound('wrong');
      } else {
        const newRows = [{ name: data.name, comparison: data.comparison }, ...rows];
        setRows(newRows);
        setGuess('');
        if (data.solved) {
          setSolved(true);
          synth.playTargetSound('win');
          onSolved(Math.max(5, 105 - newRows.length * 18), newRows.length);
        } else {
          synth.playTargetSound('click');
        }
      }
    } catch {
      setMessage('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-mono text-stone-600 bg-yellow-400/10 border-2 border-dashed border-stone-300 p-3">
        Guess the secret entity. Each guess reveals how it compares: <span className="text-green-700 font-bold">green</span> = match,{' '}
        <span className="text-yellow-700 font-bold">yellow</span> = partial, arrows show higher/lower for numbers.
      </div>

      {!solved && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            list="codex-options"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder={`Guess one of ${puzzle.entityNames.length}…`}
            className="flex-1 px-4 py-3 bg-amber-50/30 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40"
            disabled={loading}
          />
          <datalist id="codex-options">
            {remaining.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-display font-bold border-2 border-[#1e1b13] px-5 py-3 shadow-[2px_2px_0_#1e1b13] cursor-pointer disabled:opacity-50"
          >
            {loading ? '…' : 'GUESS'}
          </button>
        </form>
      )}

      {message && <p className="text-xs font-mono text-red-600">{message}</p>}

      {solved && (
        <div className="bg-green-500 text-white border-2 border-green-800 p-4 font-display font-bold flex items-center gap-2 shadow-[3px_3px_0_#14532d]">
          <Sparkles className="w-5 h-5" /> Solved in {rows.length} {rows.length === 1 ? 'guess' : 'guesses'}!
        </div>
      )}

      {/* Comparison table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead>
              <tr>
                <th className="text-left p-2 border-2 border-[#1e1b13] bg-[#1e1b13] text-white">Entity</th>
                {puzzle.attributes.map((a) => (
                  <th key={a.key} className="p-2 border-2 border-[#1e1b13] bg-[#1e1b13] text-white whitespace-nowrap">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td className="p-2 border-2 border-[#1e1b13] bg-white font-bold whitespace-nowrap">{row.name}</td>
                  {row.comparison.map((c) => (
                    <td
                      key={c.key}
                      className={`p-2 border-2 text-center font-bold ${cellColor[c.status]}`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {c.value}
                        {c.status === 'match' && <Check className="w-3 h-3" />}
                        {c.status !== 'match' && c.direction === 'up' && <ArrowUp className="w-3 h-3" />}
                        {c.status !== 'match' && c.direction === 'down' && <ArrowDown className="w-3 h-3" />}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
