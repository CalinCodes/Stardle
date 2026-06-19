import React from 'react';
import { Calendar, Award, Flame, Zap, CheckCircle2 } from 'lucide-react';
import { synth } from '../utils/audio';

interface StatsViewProps {
  stats: {
    playedCount: number;
    wonCount: number;
    currentStreak: number;
    maxStreak: number;
    completedGames: string[];
  };
  onClose?: () => void;
}

export default function StatsView({ stats, onClose }: StatsViewProps) {
  const winPercent = stats.playedCount > 0 ? Math.round((stats.wonCount / stats.playedCount) * 100) : 0;

  return (
    <div className="retro-card p-6 bg-white rounded-none flex flex-col gap-6">
      <div className="flex items-center justify-between border-b-2 border-stone-100 pb-3">
        <h3 className="font-display font-bold text-lg text-yellow-950 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Intel & Stat Desk
        </h3>
        {onClose && (
          <button
            onClick={() => {
              synth.playTargetSound('click');
              onClose();
            }}
            className="text-stone-400 hover:text-[#1e1b13] font-mono text-xs cursor-pointer"
          >
            [Close]
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="border-2 border-[#1e1b13] p-4 bg-yellow-50/20 text-center shadow-[1px_1px_0_#1e1b13]">
          <span className="font-mono text-xs text-stone-500 uppercase block tracking-wider">Puzzles Met</span>
          <span className="font-display font-bold text-3xl text-yellow-950 mt-1 block">{stats.playedCount}</span>
        </div>

        {/* Metric 2 */}
        <div className="border-2 border-[#1e1b13] p-4 bg-yellow-400/10 text-center shadow-[1px_1px_0_#1e1b13]">
          <span className="font-mono text-xs text-stone-500 uppercase block tracking-wider">Win Quotient</span>
          <span className="font-display font-bold text-3xl text-amber-600 mt-1 block">{winPercent}%</span>
        </div>

        {/* Metric 3 */}
        <div className="border-2 border-[#1e1b13] p-4 bg-amber-500/10 text-center shadow-[1px_1px_0_#1e1b13]">
          <span className="font-mono text-xs text-stone-500 uppercase block tracking-wider font-semibold text-amber-800 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            Streak
          </span>
          <span className="font-display font-bold text-3xl text-[#1e1b13] mt-1 block">{stats.currentStreak}</span>
        </div>

        {/* Metric 4 */}
        <div className="border-2 border-[#1e1b13] p-4 bg-stone-50 text-center shadow-[1px_1px_0_#1e1b13]">
          <span className="font-mono text-xs text-stone-500 uppercase block tracking-wider">Max Burn</span>
          <span className="font-display font-bold text-3xl text-[#1e1b13] mt-1 block">{stats.maxStreak}</span>
        </div>
      </div>

      {/* Grid distribution visualization */}
      <div className="flex flex-col gap-3">
        <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-500" /> Topic Affinity Calibration Progress
        </h4>
        <div className="flex flex-col gap-2.5">
          {[
            { tag: "Semantic hot/cold", pct: "75%", color: "bg-orange-400" },
            { tag: "Prompt Decipher", pct: "50%", color: "bg-yellow-400" },
            { tag: "Emoji Zeitgeist", pct: "100%", color: "bg-emerald-400" },
            { tag: "5-Question Detective", pct: "30%", color: "bg-blue-400" },
            { tag: "Adaptive Riddle", pct: "60%", color: "bg-purple-400" },
          ].map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono">
              <span className="text-stone-700 w-36 truncate">{entry.tag}</span>
              <div className="flex-1 mx-3 bg-stone-100 border border-[#1e1b13] h-4 relative">
                <div
                  className={`${entry.color} h-full border-r border-[#1e1b13]`}
                  style={{ width: entry.pct }}
                ></div>
              </div>
              <span className="text-stone-900 font-bold w-8 text-right">{entry.pct}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent solve calendar check */}
      <div className="border-t-2 border-stone-100 pt-3">
        <div className="flex items-center gap-2 mb-3 text-xs text-stone-600 font-mono">
          <Calendar className="w-4 h-4 text-stone-400" />
          <span>Recently Conquered dates</span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (5 - i));
            const dayStr = date.getDate();
            const dateStr = date.toISOString().split('T')[0];
            const isCompleted = stats.completedGames.includes(dateStr);

            return (
              <div
                key={i}
                className={`w-9 h-9 border-2 flex flex-col items-center justify-center relative select-none ${
                  isCompleted
                    ? 'bg-yellow-400 border-[#1e1b13] text-black font-bold'
                    : 'bg-white border-stone-200 text-stone-400'
                }`}
              >
                <span className="text-[10px] font-mono leading-none">{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                <span className="text-[11px] font-bold leading-none mt-1">{dayStr}</span>
                {isCompleted && (
                  <CheckCircle2 className="w-3 h-3 text-green-700 fill-white absolute -top-1 -right-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
