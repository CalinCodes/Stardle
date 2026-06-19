import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Cpu, Dice5 } from 'lucide-react';
import { ForgeFormat, ForgedGame } from '../types';
import { synth } from '../utils/audio';
import CodexGame from './forge/CodexGame';
import WordGridGame from './forge/WordGridGame';
import ConnectionsGame from './forge/ConnectionsGame';
import SudokuGame from './forge/SudokuGame';
import QuizGame from './forge/QuizGame';
import ZipGame from './forge/ZipGame';
import QueensGame from './forge/QueensGame';

interface Props {
  format: ForgeFormat;
  ai: boolean; // AI-generated content (needs a topic) vs deterministic solver
  onSuccess: (score: number, guesses: number, gameType: string) => void;
}

const SUGGESTIONS: Record<string, string[]> = {
  codex: ['pokemon', 'Marvel heroes', 'F1 drivers', 'Greek gods', 'dog breeds', 'football clubs', 'anime characters', 'planets'],
  connections: ['movies', 'food', 'music genres', 'sports', 'science', 'geography', 'video games', 'animals'],
  wordgrid: ['space', 'nature', 'technology', 'food', 'sports', 'music', 'science', 'travel'],
  quiz: ['history', 'science', 'pop culture', 'geography', 'mythology', 'space', 'movies', 'nature'],
  sudoku: ['zen garden', 'neon city', 'autumn', 'deep space', 'ocean', 'volcano', 'arctic', 'desert'],
  zip: ['city streets', 'river delta', 'circuit board', 'labyrinth', 'subway map', 'constellation', 'maze', 'vines'],
  queens: ['royal court', 'chess club', 'kingdoms', 'empire', 'dynasty', 'castle', 'realm', 'thrones'],
};

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export default function GameStage({ format, ai, onSuccess }: Props) {
  const [topic, setTopic] = useState(rand(SUGGESTIONS[format] || ['general']));
  const [difficulty, setDifficulty] = useState('medium');
  const [game, setGame] = useState<ForgedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async (overrideTopic?: string) => {
    const useTopic = (overrideTopic ?? topic).trim() || rand(SUGGESTIONS[format] || ['general']);
    setError('');
    setLoading(true);
    setGame(null);
    synth.playTargetSound('unlock');
    try {
      const res = await fetch('/api/forge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: useTopic, format, difficulty }),
      });
      if (!res.ok) throw new Error('gen failed');
      setGame(await res.json());
    } catch {
      setError('Could not generate. Check your connection / API key and retry.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load a fresh puzzle whenever the tab (format) or difficulty changes.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, difficulty]);

  const handleSolved = (score: number, guesses: number) => {
    if (game) onSuccess(score, guesses, game.format);
  };

  const renderGame = () => {
    if (!game) return null;
    const common = { key: game.id, puzzleId: game.id, onSolved: handleSolved };
    switch (game.format) {
      case 'codex': return <CodexGame {...common} puzzle={game.puzzle} />;
      case 'wordgrid': return <WordGridGame {...common} puzzle={game.puzzle} />;
      case 'connections': return <ConnectionsGame {...common} puzzle={game.puzzle} />;
      case 'sudoku': return <SudokuGame {...common} puzzle={game.puzzle} />;
      case 'zip': return <ZipGame {...common} puzzle={game.puzzle} />;
      case 'queens': return <QueensGame {...common} puzzle={game.puzzle} />;
      case 'quiz': return <QuizGame {...common} puzzle={game.puzzle} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {ai && (
          <div className="flex flex-1 min-w-[200px] gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
              placeholder="Type a topic to play…"
              className="flex-1 px-4 py-2.5 glass-strong text-sm focus:outline-none"
            />
            <button
              onClick={() => { const t = rand(SUGGESTIONS[format] || ['general']); setTopic(t); generate(t); }}
              title="Random topic"
              className="glass-btn px-3 py-2.5 cursor-pointer"
            >
              <Dice5 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Difficulty */}
        <div className="flex glass-strong rounded-xl overflow-hidden">
          {['easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-2 text-[11px] font-mono capitalize cursor-pointer transition ${
                difficulty === d ? 'bg-amber-400/80 text-black font-bold' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button onClick={() => generate()} disabled={loading} className="accent-btn px-4 py-2.5 font-display font-bold text-sm flex items-center gap-2 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : ai ? <Cpu className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Generating…' : game ? 'New puzzle' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-xs font-mono text-red-500">{error}</p>}

      {/* Title + source + AI note */}
      {game && !loading && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-60">
            <span className="font-bold">{game.title}</span>
            <span>·</span>
            <span>
              {game.source === 'gemini'
                ? (ai ? 'AI-generated' : 'AI-themed · solver-verified')
                : game.source === 'solver'
                ? 'solver-verified'
                : 'offline'}
            </span>
          </div>
          {game.note && <p className="text-xs font-sans italic opacity-70">“{game.note}”</p>}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 opacity-70">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="font-mono text-xs">{ai ? `Gemini is forging your “${topic}” puzzle…` : 'Building a guaranteed-solvable puzzle…'}</span>
        </div>
      )}

      {game && !loading && <div className="animate-fade-in">{renderGame()}</div>}
    </div>
  );
}
