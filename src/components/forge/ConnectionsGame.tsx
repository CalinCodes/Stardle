import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { synth } from '../../utils/audio';

interface Props {
  puzzleId: string;
  puzzle: { tiles: string[]; groupCount: number; groupSize: number };
  onSolved: (score: number, guesses: number) => void;
}

interface SolvedGroup {
  category: string;
  members: string[];
}

const groupColors = ['bg-yellow-400', 'bg-green-400', 'bg-sky-400', 'bg-rose-400'];

export default function ConnectionsGame({ puzzleId, puzzle, onSolved }: Props) {
  const [tiles, setTiles] = useState<string[]>(puzzle.tiles);
  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState<'won' | 'lost' | null>(null);

  useEffect(() => {
    setTiles(puzzle.tiles);
    setSelected([]);
    setSolvedGroups([]);
    setMistakes(0);
    setMessage('');
    setDone(null);
  }, [puzzleId]);

  const toggle = (tile: string) => {
    if (done) return;
    synth.playTargetSound('click');
    setSelected((s) =>
      s.includes(tile) ? s.filter((t) => t !== tile) : s.length < puzzle.groupSize ? [...s, tile] : s,
    );
  };

  const submit = async () => {
    if (selected.length !== puzzle.groupSize || loading) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/forge/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzleId, guess: selected }),
      });
      const data = await res.json();
      if (data.correct) {
        const newSolved = [...solvedGroups, { category: data.category, members: data.members }];
        setSolvedGroups(newSolved);
        setTiles((t) => t.filter((tile) => !selected.includes(tile)));
        setSelected([]);
        synth.playTargetSound('win');
        if (newSolved.length === puzzle.groupCount) {
          setDone('won');
          onSolved(Math.max(10, 100 - mistakes * 28), mistakes + 1);
        }
      } else {
        const m = mistakes + 1;
        setMistakes(m);
        setMessage(data.oneAway ? 'So close — one away!' : 'Not a group. Try again.');
        synth.playTargetSound('wrong');
        if (m >= 4) {
          setDone('lost');
        }
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-mono text-stone-600 bg-yellow-400/10 border-2 border-dashed border-stone-300 p-3">
        Find the four hidden groups of {puzzle.groupSize}. You can miss {4 - mistakes} more time(s).
      </div>

      {/* Solved groups */}
      {solvedGroups.map((g, i) => (
        <div key={g.category} className={`${groupColors[i % 4]} border-2 border-[#1e1b13] p-3 text-center`}>
          <div className="font-display font-black text-xs uppercase">{g.category}</div>
          <div className="font-mono text-[11px]">{g.members.join(' · ')}</div>
        </div>
      ))}

      {/* Tile grid */}
      {!done && (
        <div className="grid grid-cols-4 gap-1.5">
          {tiles.map((tile) => {
            const isSel = selected.includes(tile);
            return (
              <button
                key={tile}
                onClick={() => toggle(tile)}
                className={`aspect-square sm:aspect-[5/3] px-1 flex items-center justify-center text-center font-display font-bold text-[10px] sm:text-xs border-2 cursor-pointer transition select-none ${
                  isSel
                    ? 'bg-[#1e1b13] text-white border-[#1e1b13] scale-95'
                    : 'bg-white border-stone-300 hover:border-[#1e1b13]'
                }`}
              >
                {tile}
              </button>
            );
          })}
        </div>
      )}

      {message && <p className="text-xs font-mono text-red-600 text-center">{message}</p>}

      {!done && (
        <button
          onClick={submit}
          disabled={selected.length !== puzzle.groupSize || loading}
          className="self-center bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-display font-bold border-2 border-[#1e1b13] px-6 py-2.5 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
        >
          {loading ? '…' : 'SUBMIT GROUP'}
        </button>
      )}

      {done === 'won' && (
        <div className="bg-green-500 text-white border-2 border-green-800 p-3 font-display font-bold flex items-center gap-2 justify-center">
          <Sparkles className="w-5 h-5" /> All groups found!
        </div>
      )}
      {done === 'lost' && (
        <div className="bg-[#1e1b13] text-white border-2 p-3 font-display font-bold text-center">
          Too many mistakes — generate another!
        </div>
      )}
    </div>
  );
}
