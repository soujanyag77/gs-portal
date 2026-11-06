'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: 'folder' | 'stars' | 'robot' | 'backpack' | 'activity';
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = "Nothing here yet!",
  message = "Your teacher hasn't added files to this unit yet. Check back soon for exciting learning materials!",
  icon = 'backpack',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white/70 backdrop-blur-sm border-2 border-dashed border-sky-200 rounded-3xl max-w-lg mx-auto shadow-sm my-6">
      <div className="relative mb-5">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-100 to-sky-100 flex items-center justify-center shadow-inner animate-float">
          {icon === 'backpack' && <span className="text-5xl">🎒</span>}
          {icon === 'robot' && <span className="text-5xl">🤖</span>}
          {icon === 'stars' && <span className="text-5xl">⭐</span>}
          {icon === 'folder' && <span className="text-5xl">📂</span>}
          {icon === 'activity' && <span className="text-5xl">🚀</span>}
        </div>
        <div className="absolute -top-1 -right-1 bg-amber-300 text-amber-800 p-1.5 rounded-full shadow-md animate-wiggle">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-slate-800 font-display mb-2">{title}</h3>
      <p className="text-slate-500 text-base max-w-md leading-relaxed mb-5">{message}</p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-bouncy px-6 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center gap-2 shadow-pop-blue"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
