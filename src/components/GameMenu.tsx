import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  blurb: string;
}
export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface Props {
  groups: MenuGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function GameMenu({ groups, activeId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = groups.flatMap((g) => g.items).find((i) => i.id === activeId);
  const activeGroup = groups.find((g) => g.items.some((i) => i.id === activeId));

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass-strong rounded-xl w-full sm:w-72 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition"
      >
        <span className="flex flex-col items-start leading-tight text-left">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] opacity-50">{activeGroup?.label}</span>
          <span className="font-display font-bold text-base">{active?.label}</span>
        </span>
        <ChevronDown className={`w-4 h-4 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full sm:w-80 max-h-[70vh] overflow-y-auto glass-strong rounded-2xl p-2 shadow-xl animate-fade-in">
          {groups.map((group) => (
            <div key={group.label} className="mb-1.5 last:mb-0">
              <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-[0.18em] opacity-40">{group.label}</div>
              {group.items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSelect(item.id); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                      isActive ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]' : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="flex flex-col">
                      <span className="font-display font-semibold text-sm">{item.label}</span>
                      <span className="text-[11px] opacity-55">{item.blurb}</span>
                    </span>
                    {isActive && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
