'use client';

import React, { useState } from 'react';
import { X, RotateCw, Maximize2, Minimize2, Sparkles, Gamepad2 } from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { sounds } from '../sound-effects';
import { fireConfetti } from '../ConfettiCelebration';

interface HtmlInteractiveModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
}

export default function HtmlInteractiveModal({ resource, onClose }: HtmlInteractiveModalProps) {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  if (!resource) return null;

  const handleRestart = () => {
    sounds.pop();
    setIframeKey((prev) => prev + 1);
  };

  const handleCheer = () => {
    sounds.fanfare();
    fireConfetti();
  };

  const interactiveUrl = `${resource.file_url}?t=${iframeKey}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/80 backdrop-blur-md animate-pop">
      <div
        className={`bg-white w-full rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-violet-400 transition-all duration-300 ${
          isFullScreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl h-[88vh]'
        }`}
      >
        {/* Game Bar Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white px-6 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              🎮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display leading-tight">{resource.title}</h2>
                <span className="bg-violet-400/30 text-white border border-violet-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-violet-200">
                {resource.subject_name || 'Learning Subject'} • {resource.unit_name || 'Unit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheer}
              className="btn-bouncy flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-sm"
              title="Great Job!"
            >
              <Sparkles className="w-4 h-4 text-amber-900" />
              <span>Cheer!</span>
            </button>

            <button
              onClick={handleRestart}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Restart Game"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                sounds.pop();
                setIsFullScreen(!isFullScreen);
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                sounds.pop();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white ml-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sandboxed Interactive Frame */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-3 relative overflow-hidden flex items-center justify-center">
          <iframe
            key={iframeKey}
            src={interactiveUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="w-full h-full bg-white rounded-2xl border-0 shadow-lg"
            title={resource.title}
          />
        </div>

        {/* Kid Footer */}
        <div className="bg-violet-50 px-6 py-2.5 border-t border-violet-200 flex items-center justify-between text-xs text-violet-900">
          <span className="font-bold flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-violet-600" /> Sandboxed Safe Interactive Space
          </span>
          <span className="font-semibold text-slate-500">
            Click inside to play! Click Cheer when you complete the puzzle!
          </span>
        </div>
      </div>
    </div>
  );
}
