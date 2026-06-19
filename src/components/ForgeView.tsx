import React, { useEffect, useState } from 'react';
import { Wand2, RefreshCw, Cpu, Dice5, Loader2, Clock } from 'lucide-react';
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
  defaultTopic?: string;
  defaultDifficulty?: string;
  onSuccess: (score: number, guesses: number, gameType: string) => void;
}

const FORMATS: { id: ForgeFormat | 'surprise'; label: string; emoji: string; blurb: string }[] = [
  { id: 'surprise', label: 'Surprise me', emoji: '🎲', blurb: 'Let the AI pick the best format' },
  { id: 'codex', label: 'Codex (Pokédle)', emoji: '🧬', blurb: 'Attribute-deduction character guessing' },
  { id: 'wordgrid', label: 'Word Grid', emoji: '🔤', blurb: 'Wordle-style hidden word' },
  { id: 'connections', label: 'Connections', emoji: '🔗', blurb: 'Sort 16 into 4 groups' },
  { id: 'zip', label: 'Zip', emoji: '🧩', blurb: 'Connect the dots — fill every square (LinkedIn)' },
  { id: 'queens', label: 'Queens', emoji: '👑', blurb: 'One crown per row/col/region (LinkedIn)' },
  { id: 'sudoku', label: 'Sudoku', emoji: '🔢', blurb: 'Logic number grid' },
  { id: 'quiz', label: 'AI Wildcard', emoji: '✨', blurb: 'AI invents a puzzle on the fly' },
];

interface RecentItem {
  id: string;
  format: string;
  topic: string;
  title: string;
  source: string;
}

export default function ForgeView({ defaultTopic, defaultDifficulty, onSuccess }: Props) {
  const [topic, setTopic] = useState(defaultTopic || '');
  const [format, setFormat] = useState<ForgeFormat | 'surprise'>('surprise');
  const [difficulty, setDifficulty] = useState(defaultDifficulty || 'medium');
  const [game, setGame] = useState<ForgedGame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<RecentItem[]>([]);

  const loadRecent = async () => {
    try {
      const res = await fetch('/api/forge/recent?limit=10');
      if (res.ok) setRecent(await res.json());
    } catch {}
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const generate = async (overrideTopic?: string) => {
    const useTopic = (overrideTopic ?? topic).trim();
    if (!useTopic) {
      setError('Type something you’re into first — e.g. "pokemon", "F1 drivers", "Greek myths".');
      return;
    }
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
      const data: ForgedGame = await res.json();
      setGame(data);
      loadRecent();
    } catch {
      setError('Generation failed. Check your connection / API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolved = (score: number, guesses: number) => {
    if (game) onSuccess(score, guesses, game.format);
  };

  const renderGame = () => {
    if (!game) return null;
    // key by game.id so every new generation remounts cleanly (fresh state).
    const common = { key: game.id, puzzleId: game.id, onSolved: handleSolved };
    switch (game.format) {
      case 'codex':
        return <CodexGame {...common} puzzle={game.puzzle} />;
      case 'wordgrid':
        return <WordGridGame {...common} puzzle={game.puzzle} />;
      case 'connections':
        return <ConnectionsGame {...common} puzzle={game.puzzle} />;
      case 'sudoku':
        return <SudokuGame {...common} puzzle={game.puzzle} />;
      case 'zip':
        return <ZipGame {...common} puzzle={game.puzzle} />;
      case 'queens':
        return <QueensGame {...common} puzzle={game.puzzle} />;
      case 'quiz':
        return <QuizGame {...common} puzzle={game.puzzle} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Forge console */}
      <div className="retro-card prism-glow p-5 bg-gradient-to-br from-yellow-400/20 to-white dark:from-fuchsia-900/20 dark:to-[#16161e]">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-5 h-5 text-yellow-600" />
          <h3 className="font-display font-black text-lg prism-text">AI Game Forge</h3>
          <span className="ml-auto text-[10px] font-mono uppercase tracking-widest bg-[#1e1b13] text-yellow-400 px-2 py-0.5">
            ∞ Infinite
          </span>
        </div>
        <p className="text-xs text-stone-600 font-sans mb-4">
          Type anything you love. Gemini builds a brand-new playable game around it — every time, forever.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="e.g. pokemon, Formula 1, Greek myths, kitchen tools…"
            className="flex-1 px-4 py-3 bg-white border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40"
          />
          <button
            onClick={() => generate()}
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-display font-bold border-2 border-[#1e1b13] px-5 py-3 shadow-[3px_3px_0_#1e1b13] cursor-pointer flex items-center gap-2 justify-center disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            {loading ? 'FORGING…' : 'GENERATE'}
          </button>
        </div>

        {/* Format chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                synth.playTargetSound('click');
                setFormat(f.id);
              }}
              title={f.blurb}
              className={`px-2.5 py-1.5 text-[11px] font-display font-bold border-2 cursor-pointer transition select-none ${
                format === f.id
                  ? 'bg-[#1e1b13] text-yellow-400 border-[#1e1b13]'
                  : 'bg-white border-stone-300 text-stone-600 hover:border-[#1e1b13]'
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Difficulty + dice */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border-2 border-[#1e1b13]">
            {['easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 text-[11px] font-mono capitalize cursor-pointer ${
                  difficulty === d ? 'bg-[#1e1b13] text-white' : 'bg-white text-stone-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const ideas = ['pokemon', 'Marvel heroes', 'world capitals', 'F1 drivers', 'Greek mythology', 'famous paintings', 'programming languages', 'dog breeds'];
              const t = ideas[Math.floor(Math.random() * ideas.length)];
              setTopic(t);
              setFormat('surprise');
              generate(t);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-display font-bold border-2 border-[#1e1b13] bg-white hover:bg-yellow-200 cursor-pointer"
          >
            <Dice5 className="w-3.5 h-3.5" /> Random idea
          </button>
        </div>

        {error && <p className="text-xs font-mono text-red-600 mt-3">{error}</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="retro-card p-8 bg-white flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          <span className="font-mono text-xs">Gemini is forging your “{topic}” game…</span>
        </div>
      )}

      {/* Active game */}
      {game && !loading && (
        <div className="retro-card p-5 bg-white">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div>
              <h3 className="font-display font-black text-lg text-yellow-950">{game.title}</h3>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
                {game.format} · {game.difficulty} ·{' '}
                {game.source === 'gemini' ? '🟢 AI-generated' : game.source === 'solver' ? '⚙️ solver' : '🟡 offline'}
              </span>
            </div>
            <button
              onClick={() => generate()}
              className="flex items-center gap-1.5 text-xs font-display font-bold border-2 border-[#1e1b13] bg-yellow-400 hover:bg-yellow-300 px-3 py-2 shadow-[2px_2px_0_#1e1b13] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate another
            </button>
          </div>
          {renderGame()}
        </div>
      )}

      {/* Recent generations */}
      {recent.length > 0 && (
        <div className="retro-card p-4 bg-white">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-display font-bold text-[10px] uppercase tracking-widest text-stone-500">
              Freshly forged by the community
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <span
                key={r.id}
                className="px-2 py-1 border border-stone-300 bg-stone-50 font-mono text-[10px] text-stone-600"
                title={`${r.format} · ${r.source}`}
              >
                {r.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
