'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, LogOut, Sparkles, BookOpen, User as UserIcon, Eye } from 'lucide-react';
import { User } from '@/lib/types';
import { sounds } from './sound-effects';

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const router = useRouter();
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(sounds.isEnabled());
  }, []);

  const handleToggleSound = () => {
    const newVal = sounds.toggle();
    setSoundOn(newVal);
    if (newVal) sounds.pop();
  };

  const handleLogoutClick = async () => {
    sounds.pop();
    try {
      localStorage.removeItem('portal_token');
    } catch {}
    if (onLogout) {
      onLogout();
    } else {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-sky-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          onClick={() => sounds.pop()}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-pop-blue transform group-hover:scale-105 transition-transform">
            <span className="text-2xl">🎒</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 font-display tracking-tight group-hover:text-sky-600 transition-colors">
                GS Portal
              </span>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Kids
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Wonder Academy Learning Library
            </p>
          </div>
        </Link>

        {/* User Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'Sound On' : 'Sound Muted'}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors focus:outline-none"
          >
            {soundOn ? <Volume2 className="w-5 h-5 text-sky-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              {/* If student: show stars and avatar */}
              {user.role === 'student' ? (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 px-3.5 py-1.5 rounded-2xl shadow-sm">
                  <span className="text-2xl">{user.avatar || '🦊'}</span>
                  <div>
                    <div className="text-xs font-bold text-amber-900 leading-tight flex items-center gap-1">
                      {user.name}
                      <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                        ⭐ {user.stars || 0}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium">
                      {user.class_name || 'My Class'}
                    </div>
                  </div>
                </div>
              ) : (
                /* If teacher: show teacher badge */
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-purple-50 border-2 border-purple-200 px-3.5 py-1.5 rounded-2xl">
                    <span className="text-2xl">{user.avatar || '👩‍🏫'}</span>
                    <div className="hidden sm:block">
                      <div className="text-xs font-bold text-purple-900 leading-tight">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">
                        Teacher Dashboard
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/student/portal"
                    onClick={() => sounds.pop()}
                    className="btn-bouncy flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-pop-green transition-all"
                    title="Open Student View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Student View</span>
                  </Link>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogoutClick}
                className="btn-bouncy flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/student/login"
                onClick={() => sounds.pop()}
                className="btn-bouncy px-4 py-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm shadow-pop-blue transition-all"
              >
                Student Login
              </Link>
              <Link
                href="/teacher/login"
                onClick={() => sounds.pop()}
                className="btn-bouncy px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold text-sm shadow-sm transition-all"
              >
                Teacher Portal
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
