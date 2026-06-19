import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Medal, User } from 'lucide-react';
import { GlobalLeaderboardEntry } from '../types';

interface LeaderboardViewProps {
  gameType?: string;
  refreshTrigger?: number;
}

export default function LeaderboardView({ gameType, refreshTrigger }: LeaderboardViewProps) {
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const url = gameType ? `/api/games/leaderboard?gameType=${gameType}` : `/api/games/leaderboard`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (err) {
        console.error("Leaderboard loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [gameType, refreshTrigger]);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400 border-[#1e1b13] text-black scale-[1.02] shadow-[2px_2px_0_#1e1b13]';
      case 2:
        return 'bg-stone-100 border-stone-400 text-stone-900';
      case 3:
        return 'bg-amber-100 border-amber-300 text-amber-900';
      default:
        return 'bg-white border-stone-200 text-stone-700';
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank <= 3) {
      return <Medal className={`w-4 h-4 ${rank === 1 ? 'text-yellow-600 fill-yellow-400' : rank === 2 ? 'text-stone-400' : 'text-amber-600'}`} />;
    }
    return <User className="w-4 h-4 text-stone-400" />;
  };

  return (
    <div className="retro-card p-5 bg-white rounded-none flex flex-col gap-4">
      <div className="flex items-center justify-between border-b-2 border-stone-100 pb-2.5">
        <h3 className="font-display font-bold text-sm text-yellow-950 uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />
          Live Daily Lobby Board
        </h3>
        <span className="text-[10px] font-mono bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-none font-bold">
          {gameType ? `${gameType.toUpperCase()}` : 'ALL GAMES'}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-xs text-stone-500">Checking results...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400 font-mono">
          No records registered for today. Be the first to stake a claim!
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={`p-3 border-2 rounded-none flex items-center justify-between transition-all ${getRankStyle(entry.rank)}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display font-medium text-xs min-w-[20px] text-center flex items-center justify-center">
                  {getMedalIcon(entry.rank)}
                </span>
                <span className="font-display font-bold text-sm tracking-tight">{entry.username}</span>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="flex items-center gap-1 font-mono text-xs opacity-80">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{entry.timeTaken}</span>
                </div>
                <div className="font-display font-black text-sm tracking-tight min-w-[50px]">
                  {entry.score} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
