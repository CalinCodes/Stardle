import React, { useState } from 'react';
import { Sparkles, Trophy, Lightbulb, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { synth } from '../utils/audio';

const TOPIC_CHIPS = [
  { id: 'Science & Nature', icon: '🌿', color: 'bg-emerald-100 text-emerald-950 border-emerald-400' },
  { id: 'Sci-Fi & Cyberpunk', icon: '🤖', color: 'bg-purple-100 text-purple-950 border-purple-400' },
  { id: 'Movies & Media', icon: '🎬', color: 'bg-indigo-100 text-indigo-950 border-indigo-400' },
  { id: 'Pop Culture', icon: '⚡', color: 'bg-amber-100 text-amber-950 border-amber-400' },
  { id: 'Science & Tech', icon: '🛰️', color: 'bg-blue-100 text-blue-950 border-blue-400' },
  { id: 'Space & Food', icon: '🍕', color: 'bg-rose-100 text-rose-950 border-rose-400' },
  { id: 'Fantasy & Steampunk', icon: '⚙️', color: 'bg-orange-100 text-orange-950 border-orange-400' },
];

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [username, setUsername] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Pop Culture', 'Science & Nature']);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [error, setError] = useState('');

  const toggleInterest = (interest: string) => {
    synth.playTargetSound('click');
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please provide a creative codename!');
      return;
    }
    const profile: UserProfile = {
      username: username.trim(),
      interests: selectedInterests,
      difficulty,
      created_at: new Date().toISOString(),
      completedOnboarding: true,
    };
    synth.playTargetSound('win');
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 bg-[#1e1b13]/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <div className="retro-card max-w-lg w-full bg-white p-6 md:p-8 rounded-none flex flex-col gap-6 relative">
        <div className="absolute -top-3 -right-3 bg-yellow-400 border-2 border-[#1e1b13] px-3 py-1 font-display font-bold text-xs shadow-[2px_2px_0_#1e1b13] animate-bounce">
          ✨ VERSION 1.2
        </div>

        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-yellow-400 border-2 border-[#1e1b13] flex items-center justify-center rounded-none shadow-[3px_3px_0_#1e1b13]">
            <Sparkles className="w-8 h-8 text-black" />
          </div>
          <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-yellow-950 mt-2">
            Welcome to Stardle!
          </h2>
          <p className="text-sm text-stone-600 font-sans leading-relaxed">
            The personalized daily puzzle universe powered by Gemini AI. Complete challenges, raise your streak level, and calibrate the adaptive Riddle Oracle!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Step 1: Username */}
          <div className="flex flex-col gap-2">
            <label className="font-display font-semibold text-sm text-[#1e1b13] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Your Solver Codename
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. StarVoyager, PixelSocrates"
              className="w-full px-4 py-3 bg-amber-50/50 border-2 border-[#1e1b13] font-mono text-sm focus:outline-none focus:bg-yellow-50/40 rounded-none transition"
              maxLength={20}
            />
            {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
          </div>

          {/* Step 2: Interests */}
          <div className="flex flex-col gap-2">
            <label className="font-display font-semibold text-sm text-[#1e1b13] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Theme Affinities (Selected feeds prioritize these)
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TOPIC_CHIPS.map((topic) => {
                const isActive = selectedInterests.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleInterest(topic.id)}
                    className={`px-3 py-2 border-2 text-xs font-display font-bold flex items-center gap-1.5 cursor-pointer transition select-none ${
                      isActive
                        ? 'bg-yellow-400 border-[#1e1b13] text-black shadow-[2px_2px_0_#1e1b13] translate-y-[-2px]'
                        : `${topic.color} opacity-60 hover:opacity-100 border-stone-300`
                    }`}
                  >
                    <span>{topic.icon}</span>
                    <span>{topic.id}</span>
                    {isActive && <Check className="w-3 w-3 inline-block ml-0.5 text-black stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Difficulty Choice */}
          <div className="flex flex-col gap-2">
            <span className="font-display font-semibold text-sm text-[#1e1b13]">Initial Solving Rigor</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['easy', 'medium', 'hard'] as const).map((level) => {
                const isSelected = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      synth.playTargetSound('click');
                      setDifficulty(level);
                    }}
                    className={`py-2 px-3 text-xs capitalize font-mono border-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1e1b13] text-white border-[#1e1b13] font-bold shadow-[2px_2px_0_#ecc94b]'
                        : 'bg-white text-stone-700 border-stone-350 hover:bg-stone-50'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-4 bg-yellow-400 border-2 border-[#1e1b13] font-display font-bold text-center text-sm shadow-[4px_4px_0_#1e1b13] hover:bg-yellow-350 cursor-pointer text-black transition active:translate-y-0.5 active:shadow-[1px_1px_0_#1e1b13]"
          >
            ENTER THE STARDLE LOBBY
          </button>
        </form>
      </div>
    </div>
  );
}
