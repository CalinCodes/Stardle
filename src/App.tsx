import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  Activity,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  RefreshCw,
  Flame,
  User,
  Settings,
  HelpCircle,
  Zap,
  Cpu
} from 'lucide-react';
import { GameType, UserProfile } from './types';
import { synth } from './utils/audio';

// Custom sub-components
import Onboarding from './components/Onboarding';
import StatsView from './components/StatsView';
import LeaderboardView from './components/LeaderboardView';

// Individual games
import SynonymSeekersGame from './components/SynonymSeekersGame';
import PromptDetectiveGame from './components/PromptDetectiveGame';
import EmojiZeitgeistGame from './components/EmojiZeitgeistGame';
import DailyDetectiveGame from './components/DailyDetectiveGame';
import CalibrationRiddleGame from './components/CalibrationRiddleGame';
import NegotiationGame from './components/NegotiationGame';
import DialectDecoderGame from './components/DialectDecoderGame';
import HallucinationGame from './components/HallucinationGame';
import MissingLinkGame from './components/MissingLinkGame';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<GameType>(GameType.SEMANTIC);
  const [isInfinite, setIsInfinite] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  
  // Game metrics
  const [stats, setStats] = useState({
    playedCount: 0,
    wonCount: 0,
    currentStreak: 0,
    maxStreak: 0,
    completedGames: [] as string[]
  });

  // Local config info
  const [engineInfo, setEngineInfo] = useState({
    appName: "Stardle",
    theme: "yellow",
    isGeminiActive: false
  });

  // 1. Initial State Load
  useEffect(() => {
    // Load profile
    const savedProfile = localStorage.getItem('stardle_profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Profile parsing error:", e);
      }
    }

    // Load stats
    const savedStats = localStorage.getItem('stardle_stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {}
    } else {
      // Seed default stats
      const initial = { playedCount: 3, wonCount: 2, currentStreak: 2, maxStreak: 3, completedGames: [] };
      setStats(initial);
      localStorage.setItem('stardle_stats', JSON.stringify(initial));
    }

    // Load config from server
    async function loadConfig() {
      try {
        const res = await fetch('/api/games/config');
        if (res.ok) {
          const data = await res.json();
          setEngineInfo(data);
        }
      } catch (err) {}
    }
    loadConfig();
  }, []);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('stardle_profile', JSON.stringify(newProfile));
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    synth.enabled = nextState;
    synth.playTargetSound('click');
  };

  // 2. Play win callback
  const handleGameSuccess = async (score: number, guessesCount: number) => {
    synth.playTargetSound('win');
    
    // Update local stats
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = stats.currentStreak;
    if (!stats.completedGames.includes(todayStr)) {
      if (stats.completedGames.includes(yesterdayStr) || stats.currentStreak === 0) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const newStats = {
      playedCount: stats.playedCount + 1,
      wonCount: stats.wonCount + 1,
      currentStreak: newStreak,
      maxStreak: Math.max(stats.maxStreak, newStreak),
      completedGames: [...new Set([...stats.completedGames, todayStr])]
    };

    setStats(newStats);
    localStorage.setItem('stardle_stats', JSON.stringify(newStats));

    // Submit score to global daily leaderboard
    if (profile?.username) {
      try {
        await fetch('/api/games/leaderboard/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: profile.username,
            gameType: activeTab,
            score,
            timeTaken: "1m 15s",
            guessesCount,
            date: todayStr
          })
        });
        // Trigger scoreboard refresh
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Leaderboard submit error:", err);
      }
    }
  };

  const handleResetProfile = () => {
    synth.playTargetSound('unlock');
    localStorage.removeItem('stardle_profile');
    localStorage.removeItem('stardle_stats');
    setProfile(null);
  };

  const getActiveGameTitle = () => {
    switch (activeTab) {
      case GameType.SEMANTIC: return "Synonym Seekers (Semantic Match)";
      case GameType.PROMPT: return "Prompt Detective (AI Art Decipher)";
      case GameType.ZEITGEIST: return "Emoji Zeitgeist (Trend Translator)";
      case GameType.DETECTIVE: return "Daily Detective (10-Question Mystery)";
      case GameType.RIDDLE: return "Adaptive Riddle Calibration Oracle";
      case GameType.NEGOTIATION: return "The Art of the Deal (Negotiation)";
      case GameType.DIALECT: return "Dialect Decoder (The Stylized Plot)";
      case GameType.HALLUCINATION: return "Spot the Hallucination (Fact or Fib)";
      case GameType.MISSINGLINK: return "The Missing Link (Connections)";
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf2] text-[#1e1b13] flex flex-col justify-between selection:bg-yellow-200">
      {/* Onboarding trigger */}
      {!profile && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Header Bar */}
      <header className="bg-white border-b-4 border-[#1e1b13] sticky top-0 z-40 select-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-yellow-400 border-2 border-[#1e1b13] flex items-center justify-center rounded-none shadow-[2px_2px_0_#1e1b13] transform -rotate-3 hover:rotate-0 transition">
              <span className="font-display font-black text-xl text-black">S</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-display font-black text-xl tracking-tight leading-none text-yellow-950 flex items-center gap-1">
                Stardle
                <span className="w-2 h-2 rounded-full bg-yellow-400 border border-black inline-block animate-ping"></span>
              </h1>
              <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">
                AI Daily Puzzle Lounge
              </span>
            </div>
          </div>

          {/* User controls / widgets */}
          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-1 font-mono text-xs bg-yellow-400/15 border border-[#1e1b13] px-2 py-1">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="font-bold">{stats.currentStreak}D</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 border border-[#1e1b13] bg-white text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              title="Toggle retro synth sounds"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Stats Desk toggle */}
            <button
              onClick={() => {
                synth.playTargetSound('click');
                setShowStatsModal(!showStatsModal);
              }}
              className="px-3 py-1.5 border-2 border-[#1e1b13] bg-white font-display font-bold text-xs shadow-[2px_2px_0_#1e1b13] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#1e1b13] cursor-pointer"
            >
              STATS
            </button>

            {/* Profile Reset */}
            {profile && (
              <span className="hidden sm:flex items-center gap-1 text-xs font-mono bg-stone-100 border px-2 py-1 max-w-[120px] truncate">
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{profile.username}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 flex flex-col gap-6 md:gap-8">
        {/* Onboarding info strip */}
        {profile && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-yellow-400 p-3 border-2 border-[#1e1b13] shadow-[3px_3px_0_#1e1b13]">
            <div className="flex items-center gap-2 text-xs font-display font-medium text-black">
              <Zap className="w-4 h-4 animate-bounce shrink-0" />
              <span>
                Signed in as <strong className="font-black">{profile.username}</strong>. Adaptive Sphinx theme centered on:{' '}
                <span className="font-mono bg-white px-1.5 py-0.5 border border-black text-[10px] uppercase font-bold text-yellow-950">
                  {profile.interests.slice(0, 2).join(', ') || 'Pop Culture'}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-black font-semibold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                Gemini State: {engineInfo.isGeminiActive ? "🟢 Active Intelligence" : "🟡 Offline Fallback"}
              </span>
              <button
                onClick={handleResetProfile}
                className="text-[10px] font-mono hover:underline text-black/80 font-bold ml-2 shrink-0 cursor-pointer"
              >
                [Change Interests]
              </button>
            </div>
          </div>
        )}

        {/* Play mode switches & tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-200 pb-2">
            {/* Tab switch row */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { type: GameType.SEMANTIC, label: "Word Seekers 🌡️", tag: "Hot & Cold" },
                { type: GameType.PROMPT, label: "Prompt Detective 🎨", tag: "AI Art" },
                { type: GameType.ZEITGEIST, label: "Emoji Zeitgeist ⚡", tag: "Pop Culture" },
                { type: GameType.DETECTIVE, label: "Daily Detective 🔎", tag: "Mystery" },
                { type: GameType.RIDDLE, label: "Riddle Sphinx 🔮", tag: "Sphinx Adaptive" },
                { type: GameType.NEGOTIATION, label: "Art of Deal 🤝", tag: "Negotiate" },
                { type: GameType.DIALECT, label: "Dialect Decoder 🎭", tag: "Dialects" },
                { type: GameType.HALLUCINATION, label: "Fact or Fib 🕵️", tag: "Fact check" },
                { type: GameType.MISSINGLINK, label: "Missing Link 🔗", tag: "Links" },
              ].map((tab) => {
                const isActive = activeTab === tab.type;
                return (
                  <button
                    key={tab.type}
                    onClick={() => {
                      synth.playTargetSound('click');
                      setActiveTab(tab.type);
                    }}
                    className={`px-3 py-2 text-xs font-display font-bold border-2 cursor-pointer transition select-none ${
                      isActive
                        ? 'bg-yellow-400 border-[#1e1b13] text-black shadow-[2px_2px_0_#1e1b13] translate-y-[-1px]'
                        : 'bg-white border-stone-200 text-stone-600 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="block sm:hidden">{tab.tag}</span>
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode Toggle: Daily vs Infinite */}
            <div className="flex items-center bg-stone-100 border border-[#1e1b13] p-1.5 shadow-[1px_1px_0_#1e1b13] shrink-0 self-start sm:self-auto">
              <button
                onClick={() => {
                  synth.playTargetSound('click');
                  setIsInfinite(false);
                }}
                className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase transition select-none cursor-pointer ${
                  !isInfinite ? 'bg-[#1e1b13] text-white font-black' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Daily Match
              </button>
              <button
                onClick={() => {
                  synth.playTargetSound('click');
                  setIsInfinite(true);
                }}
                className={`px-2.5 py-1 text-[11px] font-display font-bold uppercase transition select-none cursor-pointer ${
                  isInfinite ? 'bg-yellow-400 text-black border border-black shadow-[1px_1px_0_#000]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Infinite
              </button>
            </div>
          </div>

          {/* Active play header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mt-1">
            <h2 className="font-display font-black text-lg md:text-xl tracking-tight text-yellow-950 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-yellow-400 border border-black rounded-none"></span>
              {getActiveGameTitle()}
            </h2>

            <div className="flex items-center gap-2 font-mono text-[10px] text-stone-500 uppercase tracking-widest bg-stone-50 px-2 py-0.5 border">
              <span>Mode: </span>
              <span className="font-bold text-yellow-600">
                {isInfinite ? "Practice Loops" : "World Canonical Date"}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard split content side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          {/* Active Solving Engine block */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {activeTab === GameType.SEMANTIC && (
              <SynonymSeekersGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.PROMPT && (
              <PromptDetectiveGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.ZEITGEIST && (
              <EmojiZeitgeistGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.DETECTIVE && (
              <DailyDetectiveGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.RIDDLE && (
              <CalibrationRiddleGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                interests={profile?.interests || ["Science"]}
                difficulty={profile?.difficulty || "medium"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.NEGOTIATION && (
              <NegotiationGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.DIALECT && (
              <DialectDecoderGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.HALLUCINATION && (
              <HallucinationGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
            {activeTab === GameType.MISSINGLINK && (
              <MissingLinkGame
                isInfinite={isInfinite}
                username={profile?.username || "GuestSolver"}
                onSuccess={handleGameSuccess}
              />
            )}
          </div>

          {/* Sidebar block: Leaderboard and Stats */}
          <div className="flex flex-col gap-6 lg:border-l-2 lg:border-dashed lg:border-stone-200 lg:pl-6">
            {/* Quick Stats widget */}
            <div className="retro-card p-4 bg-yellow-400 font-display font-medium text-xs leading-none flex items-center justify-between text-black">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <Award className="w-4 h-4" />
                <span>Solver Score Index</span>
              </div>
              <span className="font-mono font-bold bg-white px-2 py-1 text-black text-xs border border-black">
                {stats.wonCount * 125} pts
              </span>
            </div>

            {/* Realtime Leaderboards */}
            <LeaderboardView gameType={activeTab} refreshTrigger={refreshTrigger} />
            
            {/* Quick intelligence strip */}
            <div className="retro-card p-4 bg-white rounded-none border-stone-200 text-xs">
              <span className="font-display font-bold text-yellow-950 block mb-1 uppercase tracking-wider text-[10px]">
                💡 LOBBY NOTICE BOARD
              </span>
              <p className="text-stone-600 font-sans leading-relaxed">
                Matches are seeded worldwide at exactly 00:00 UTC (Universal Coordinated Time). All solvers on this globe get that exact same target sequence today so you can compare ranks!
              </p>
            </div>
          </div>
        </div>

        {/* Stats modal sheet display */}
        {showStatsModal && (
          <div className="fixed inset-0 bg-[#1e1b13]/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
            <div className="max-w-md w-full">
              <StatsView
                stats={{
                  playedCount: stats.playedCount,
                  wonCount: stats.wonCount,
                  currentStreak: stats.currentStreak,
                  maxStreak: stats.maxStreak,
                  completedGames: stats.completedGames
                }}
                onClose={() => setShowStatsModal(false)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t-2 border-stone-100 py-6 mt-12 select-none">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5">
            <span>© 2026 Stardle Game Studios</span>
            <span className="text-yellow-500">•</span>
            <span className="hover:underline">Terms of Intelligence</span>
          </div>

          <span>
            Calibrated on Gemini Models • European West Run Environment
          </span>
        </div>
      </footer>
    </div>
  );
}
