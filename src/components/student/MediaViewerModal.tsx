'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Music,
  Video as VideoIcon,
  ExternalLink,
} from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { sounds } from '../sound-effects';

interface MediaViewerModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function MediaViewerModal({ resource, onClose, onDownload }: MediaViewerModalProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [muted, setMuted] = useState<boolean>(false);

  const isAudio = resource?.file_type === 'audio';

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [resource]);

  if (!resource) return null;

  const togglePlay = () => {
    sounds.pop();
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!mediaRef.current) return;
    const cur = mediaRef.current.currentTime;
    const dur = mediaRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);
    setProgress((cur / dur) * 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mediaRef.current) return;
    const seekTo = (parseFloat(e.target.value) / 100) * (mediaRef.current.duration || 0);
    mediaRef.current.currentTime = seekTo;
    setProgress(parseFloat(e.target.value));
  };

  const changeSpeed = (newSpeed: number) => {
    sounds.pop();
    setSpeed(newSpeed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const mediaUrl = `${resource.file_url}?t=${resource.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-pop">
      <div
        className={`bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 ${
          isAudio ? 'border-sky-300' : 'border-emerald-300'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white shadow-md ${
            isAudio ? 'bg-gradient-to-r from-sky-500 to-blue-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              {isAudio ? '🎵' : '🎬'}
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">{resource.title}</h2>
              <p className="text-xs text-white/80 font-medium">
                {resource.subject_name || 'Subject'} • {resource.unit_name || 'Unit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.fanfare();
                window.open(mediaUrl, '_blank');
              }}
              title="Open media in new tab"
              className="btn-bouncy flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>New Tab ↗</span>
            </button>

            <button
              onClick={() => {
                sounds.star();
                onDownload();
              }}
              className="btn-bouncy flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Save</span>
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

        {/* Media Content */}
        <div className="bg-slate-900 flex flex-col items-center justify-center p-4 min-h-[300px]">
          {isAudio ? (
            <div className="w-full flex flex-col items-center justify-center py-8">
              <audio
                ref={mediaRef as any}
                src={mediaUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                muted={muted}
              />
              {/* Dancing Vinyl / Boombox Mascot */}
              <div
                className={`w-36 h-36 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-6xl shadow-2xl transition-transform duration-300 ${
                  isPlaying ? 'animate-bounce shadow-sky-500/50' : 'scale-95'
                }`}
              >
                🎧
              </div>
              <p className="text-white/80 font-bold mt-4 text-sm font-display flex items-center gap-2">
                <Music className="w-4 h-4 text-sky-400" />
                {isPlaying ? 'Listening to Story / Audio...' : 'Tap Play to Listen!'}
              </p>
            </div>
          ) : (
            <div className="w-full h-full max-h-[500px] flex items-center justify-center">
              <video
                ref={mediaRef as any}
                src={mediaUrl}
                className="w-full rounded-2xl max-h-[460px] shadow-lg"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                muted={muted}
                onClick={togglePlay}
              />
            </div>
          )}
        </div>

        {/* Playback Controls Bar */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          {/* Progress Slider */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-slate-500 min-w-[36px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress || 0}
              onChange={handleSeek}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
            />
            <span className="text-xs font-bold text-slate-500 min-w-[36px]">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            {/* Speed Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">Speed:</span>
              {[0.8, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    speed === s
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Main Play/Pause Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sounds.pop();
                  if (mediaRef.current) mediaRef.current.currentTime = 0;
                }}
                className="p-2.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="btn-bouncy w-14 h-14 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center shadow-pop-blue transform hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>

              <button
                onClick={() => {
                  sounds.pop();
                  setMuted(!muted);
                }}
                className="p-2.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Description note */}
            <div className="text-xs text-slate-500 font-medium hidden sm:block max-w-[150px] truncate">
              {resource.description || 'Enjoy the lesson!'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
