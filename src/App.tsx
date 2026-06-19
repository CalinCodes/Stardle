import React, { useState, useEffect } from 'react';
import { Trophy, Award, Volume2, VolumeX, Flame, Sun, Moon, User } from 'lucide-react';
import { ForgeFormat } from './types';
import { synth } from './utils/audio';

import StatsView from './components/StatsView';
import LeaderboardView from './components/LeaderboardView';
import GameMenu, { MenuGroup } from './components/GameMenu';
import GameStage from './components/GameStage';

// Sensory (dialed.gg-style)
import ColorGame from './components/senses/ColorGame';
import ShapeGame from './components/senses/ShapeGame';
import SoundGame from './components/senses/SoundGame';
import TimeGame from './components/senses/TimeGame';

// Classic AI-judged games
import SynonymSeekersGame from './components/SynonymSeekersGame';
import EmojiZeitgeistGame from './components/EmojiZeitgeistGame';
import DailyDetectiveGame from './components/DailyDetectiveGame';
import CalibrationRiddleGame from './components/CalibrationRiddleGame';
import NegotiationGame from './components/NegotiationGame';
import DialectDecoderGame from './components/DialectDecoderGame';
import MissingLinkGame from './components/MissingLinkGame';

const SENSORY = ['color', 'shape', 'sound', 'time'];
const AI_CONTENT: ForgeFormat[] = ['codex', 'connections', 'wordgrid', 'quiz'];
const FORGE = ['codex', 'connections', 'wordgrid', 'quiz', 'sudoku', 'zip', 'queens'];

const GROUPS: MenuGroup[] = [
  {
    label: 'Senses',
    items: [
      { id: 'color', label: 'Color Memory', blurb: 'See a colour, then recreate it from memory with sliders' },
      { id: 'shape', label: 'Pattern Memory', blurb: 'Memorise a grid pattern, then redraw it' },
      { id: 'sound', label: 'Pitch Memory', blurb: 'Hear a tone, then match its pitch with a slider' },
      { id: 'time', label: 'Time Memory', blurb: 'Watch a duration, then reproduce it by holding' },
    ],
  },
  {
    label: 'Guess · AI-generated',
    items: [
      { id: 'codex', label: 'Guess Who', blurb: 'Guess the hidden character; each guess reveals matching traits' },
      { id: 'connections', label: 'Connections', blurb: 'Sort 16 words into 4 hidden groups of 4' },
      { id: 'wordgrid', label: 'Word Grid', blurb: 'Guess the hidden word from green/yellow letter clues' },
      { id: 'quiz', label: 'Trivia', blurb: 'Solve an AI-made trivia / odd-one-out puzzle' },
    ],
  },
  {
    label: 'Logic · solver-built',
    items: [
      { id: 'sudoku', label: 'Sudoku', blurb: 'Fill the grid so every row, column and box has each number once' },
      { id: 'zip', label: 'Zip', blurb: 'Draw one line covering every cell, hitting the dots in order' },
      { id: 'queens', label: 'Queens', blurb: 'One crown per row, column and colour region — none touching' },
    ],
  },
  {
    label: 'Classics · AI-judged',
    items: [
      { id: 'semantic', label: 'Word Heat', blurb: 'Guess the secret word — closer meanings read hotter' },
      { id: 'zeitgeist', label: 'Emoji Code', blurb: 'Decode a string of emoji into what it describes' },
      { id: 'detective', label: 'Whodunit', blurb: 'Ask yes/no questions to crack a lateral mystery' },
      { id: 'riddle', label: 'Riddles', blurb: 'Solve a fresh AI-written riddle' },
      { id: 'negotiation', label: 'Haggle', blurb: 'Talk an AI merchant down to your price' },
      { id: 'dialect', label: 'In Other Words', blurb: 'Identify what is being described in a strange voice' },
      { id: 'missinglink', label: 'Word Bridge', blurb: 'Write one sentence that logically links two random things' },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

// Per-game "how to play" shown in the About panel for the active game.
const HOW_TO_PLAY: Record<string, string> = {
  color: 'A colour flashes for a couple of seconds, then vanishes. Recreate it with the hue, saturation and brightness sliders. 5 rounds × 10 pts — only near-perfect matches score.',
  shape: 'Memorise the lit cells, then reproduce the pattern from memory on the blank grid. 5 rounds; vague guesses barely score, so be precise.',
  sound: 'Listen to a tone, then slide to the same pitch (replay yours to compare). 5 rounds; land within a couple of semitones to score.',
  time: 'Watch how long the block stays lit, then press and hold for the exact same duration. 5 rounds; more than ~a third off scores nothing.',
  codex: 'Guess the hidden character. Each guess adds a row showing which traits match (green), partly match (yellow) or miss, with ↑/↓ for numbers. Fewer guesses = higher score.',
  connections: 'Select the 4 words you think share a hidden theme and submit. Find all 4 groups — you get only 4 mistakes.',
  wordgrid: 'Guess the hidden word. Tiles turn green (right spot), yellow (wrong spot) or grey (absent). Solve in as few rows as you can.',
  quiz: 'Answer the AI-built puzzle (multiple-choice, odd-one-out, sequence or progressive clues). First-try answers score highest; each miss costs a lot.',
  sudoku: 'Fill every row, column and box with each number exactly once. Tap a cell, then a number. Fewer checks = higher score.',
  zip: 'Draw one continuous line through every cell, visiting the numbered dots in order. Drag to draw, drag back to undo.',
  queens: 'Place one crown in every row, column and colour region — no two crowns may touch, even diagonally. Tap a cell to cycle dot → crown → clear.',
  semantic: 'Guess the secret word. Each guess shows a “temperature” — closer in meaning runs hotter. Win by finding the exact word.',
  zeitgeist: 'A string of emoji stands for a movie, event or thing. Type what it represents.',
  detective: 'A strange scenario is described. Ask yes/no questions to gather clues, then submit your explanation of what happened.',
  riddle: 'Solve the AI-written riddle and type your answer — close synonyms are accepted.',
  negotiation: 'Haggle the AI merchant down. Be persuasive — only a deal you actually close pays off well.',
  dialect: 'Something ordinary is described in a bizarre voice or style. Work out what it really is.',
  missinglink: 'You get two unrelated things. Write a single coherent sentence that links them; the AI judges how well it connects.',
};

const CLASSIC_COMPONENTS: Record<string, React.ComponentType<any>> = {
  semantic: SynonymSeekersGame,
  zeitgeist: EmojiZeitgeistGame,
  detective: DailyDetectiveGame,
  riddle: CalibrationRiddleGame,
  negotiation: NegotiationGame,
  dialect: DialectDecoderGame,
  missinglink: MissingLinkGame,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('color');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [username, setUsername] = useState('');
  const [needName, setNeedName] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [engineInfo, setEngineInfo] = useState({ isGeminiActive: false });

  const [stats, setStats] = useState({
    playedCount: 0,
    wonCount: 0,
    currentStreak: 0,
    maxStreak: 0,
    completedGames: [] as string[],
  });

  useEffect(() => {
    const savedName = localStorage.getItem('stardle_name');
    if (savedName) setUsername(savedName);
    const savedStats = localStorage.getItem('stardle_stats');
    if (savedStats) { try { setStats(JSON.parse(savedStats)); } catch {} }
    setTheme((localStorage.getItem('stardle_theme') as 'light' | 'dark') || 'light');
    fetch('/api/games/config').then((r) => r.ok && r.json().then(setEngineInfo)).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('stardle_theme', theme);
  }, [theme]);

  const toggleSound = () => { const n = !soundEnabled; setSoundEnabled(n); synth.enabled = n; synth.playTargetSound('click'); };
  const toggleTheme = () => { synth.playTargetSound('click'); setTheme((t) => (t === 'dark' ? 'light' : 'dark')); };
  const saveName = (name: string) => { setUsername(name); localStorage.setItem('stardle_name', name); if (name.trim()) setNeedName(false); };

  const handleGameSuccess = async (score: number, guessesCount: number, gameType: string) => {
    synth.playTargetSound('win');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = stats.currentStreak;
    if (!stats.completedGames.includes(todayStr)) {
      newStreak = stats.completedGames.includes(yesterdayStr) || stats.currentStreak === 0 ? newStreak + 1 : 1;
    }
    const newStats = {
      playedCount: stats.playedCount + 1,
      wonCount: stats.wonCount + 1,
      currentStreak: newStreak,
      maxStreak: Math.max(stats.maxStreak, newStreak),
      completedGames: [...new Set([...stats.completedGames, todayStr])],
    };
    setStats(newStats);
    localStorage.setItem('stardle_stats', JSON.stringify(newStats));

    if (!username.trim()) { setNeedName(true); return; }
    try {
      await fetch('/api/games/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gameType, score, timeTaken: '—', guessesCount, date: todayStr }),
      });
      setRefreshTrigger((p) => p + 1);
    } catch {}
  };

  const activeDef = ALL_ITEMS.find((g) => g.id === activeTab)!;

  const renderActiveGame = () => {
    if (SENSORY.includes(activeTab)) {
      const onComplete = (score: number) => handleGameSuccess(score, 5, activeTab);
      switch (activeTab) {
        case 'color': return <ColorGame onComplete={onComplete} />;
        case 'shape': return <ShapeGame onComplete={onComplete} />;
        case 'sound': return <SoundGame onComplete={onComplete} />;
        case 'time': return <TimeGame onComplete={onComplete} />;
      }
    }
    if (FORGE.includes(activeTab)) {
      return <GameStage format={activeTab as ForgeFormat} ai={AI_CONTENT.includes(activeTab as ForgeFormat)} onSuccess={handleGameSuccess} />;
    }
    const Classic = CLASSIC_COMPONENTS[activeTab];
    if (Classic) {
      return (
        <Classic
          isInfinite
          username={username || 'GuestSolver'}
          interests={['Science', 'Pop Culture']}
          difficulty="medium"
          onSuccess={(s: number, g: number) => handleGameSuccess(s, g, activeTab)}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="aurora" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b" style={{ borderColor: 'var(--surface-line)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-yellow-400 border-2 border-[#1e1b13] flex items-center justify-center shadow-[2px_2px_0_#1e1b13] transform -rotate-3 hover:rotate-0 transition shrink-0">
              <span className="font-display font-black text-xl" style={{ color: '#1e1b13' }}>S</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-display font-black text-lg sm:text-xl tracking-tight leading-none text-yellow-950">
                Stardle
              </h1>
              <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">
                AI Daily Puzzle Lounge
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono glass px-2.5 py-1.5 rounded-full">
              <Flame className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="font-semibold">{stats.currentStreak}d</span>
            </div>
            <div className={`flex items-center gap-1.5 glass px-2.5 py-1.5 rounded-full ${needName ? 'ring-2' : ''}`} style={needName ? { boxShadow: '0 0 0 2px var(--accent)' } : {}}>
              <User className="w-3.5 h-3.5 opacity-55" />
              <input value={username} onChange={(e) => saveName(e.target.value)} placeholder="your name" maxLength={20}
                className="bg-transparent text-xs font-mono w-20 focus:outline-none focus:w-28 transition-all" />
            </div>
            <button onClick={toggleSound} className="glass-btn p-2 rounded-full cursor-pointer" title="Sound">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={toggleTheme} className="glass-btn p-2 rounded-full cursor-pointer" title="Theme">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => { synth.playTargetSound('click'); setShowStatsModal(true); }} className="glass-btn px-3 py-2 rounded-full font-display font-semibold text-xs cursor-pointer">Stats</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-6 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
        <section className="lg:col-span-2 flex flex-col gap-4 min-w-0">
          {/* Game selector (dropdown) */}
          <GameMenu groups={GROUPS} activeId={activeTab} onSelect={(id) => { synth.playTargetSound('click'); setActiveTab(id); }} />

          {/* Active game */}
          <div className="retro-card p-4 sm:p-6 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-4 gap-1">
              <h2 className="font-display font-extrabold text-xl tracking-tight">{activeDef.label}</h2>
              <span className="text-[11px] font-mono opacity-55 leading-snug">{activeDef.blurb}</span>
            </div>
            {/* wide boards (sudoku, zip, etc.) scroll instead of overflowing on mobile */}
            <div key={activeTab} className="overflow-x-auto -mx-1 px-1">{renderActiveGame()}</div>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <div className="retro-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-semibold text-sm">
              <Award className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Solver Score
            </div>
            <span className="font-mono font-semibold text-sm glass px-3 py-1 rounded-full">{stats.wonCount * 125} pts</span>
          </div>

          {needName && (
            <div className="retro-card p-4 text-xs font-mono" style={{ boxShadow: '0 0 0 2px var(--accent)' }}>
              Add your name in the header to appear on the leaderboard.
            </div>
          )}

          <LeaderboardView gameType={activeTab} refreshTrigger={refreshTrigger} />

          <div className="retro-card p-4 text-xs">
            <span className="font-display font-semibold uppercase tracking-wider text-[10px] opacity-55 mb-1.5 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> How to play · {activeDef.label}
            </span>
            <p className="opacity-75 leading-relaxed font-sans">
              {HOW_TO_PLAY[activeTab] || activeDef.blurb}
            </p>
            <p className="opacity-50 leading-relaxed font-sans mt-2 pt-2 border-t border-current/10">
              {SENSORY.includes(activeTab)
                ? 'Scored out of 50 over 5 rounds.'
                : AI_CONTENT.includes(activeTab as ForgeFormat)
                ? `AI-generated fresh each time via Gemini (${engineInfo.isGeminiActive ? 'active' : 'offline'}).`
                : FORGE.includes(activeTab)
                ? 'Built by a deterministic solver — always solvable.'
                : `Judged live by Gemini (${engineInfo.isGeminiActive ? 'active' : 'offline'}).`}
            </p>
          </div>
        </aside>
      </main>

      <footer className="py-6 mt-8 text-center text-xs font-mono opacity-40">© 2026 Stardle · Daily Mind Games</footer>

      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full">
            <StatsView stats={stats} onClose={() => setShowStatsModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
