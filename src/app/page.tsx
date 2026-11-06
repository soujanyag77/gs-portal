'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Gamepad2,
  FileText,
  Video,
  BarChart2,
  ShieldCheck,
  Star,
  ChevronRight,
  School,
  ArrowRight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { sounds } from '@/components/sound-effects';
import { fireConfetti } from '@/components/ConfettiCelebration';
import { User } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch {
        // guest
      }
    }
    checkUser();
  }, []);

  const handleStudentClick = () => {
    sounds.fanfare();
    fireConfetti();
    if (currentUser?.role === 'student') {
      router.push('/student/portal');
    } else {
      router.push('/student/login');
    }
  };

  const handleTeacherClick = () => {
    sounds.pop();
    if (currentUser?.role === 'teacher') {
      router.push('/teacher/dashboard');
    } else {
      router.push('/teacher/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50 bg-polka">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col items-center justify-center text-center">
        {/* Welcome Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-amber-300 shadow-sm text-amber-900 text-xs sm:text-sm font-extrabold mb-6 animate-float">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Welcome to the Wonder Academy Learning Portal!</span>
          <span className="text-xl">🌟</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl font-black font-display text-slate-800 tracking-tight leading-tight max-w-4xl mb-4">
          Where Learning Meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500">Play &amp; Wonder</span>!
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl font-medium mb-12 leading-relaxed">
          Explore interactive simulations, flip through picture books, watch science discoveries, and practice worksheets tailored class-by-class.
        </p>

        {/* Dual Giant Role Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
          {/* Student Portal Card */}
          <div
            onClick={handleStudentClick}
            className="group relative bg-white rounded-4xl p-8 border-4 border-amber-300 hover:border-amber-400 shadow-bouncy hover:shadow-2xl transition-all cursor-pointer text-left flex flex-col justify-between overflow-hidden transform hover:-translate-y-1.5"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-100 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-amber-400 text-white flex items-center justify-center text-3xl shadow-pop-yellow mb-6 transform group-hover:rotate-6 transition-transform">
                🚀
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2 border border-amber-300">
                For Kids &amp; Students
              </div>

              <h2 className="text-3xl font-black font-display text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">
                I am a Student!
              </h2>

              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                Pick your classroom, enter your cute animal PIN, and discover worksheets, games, videos, and reading materials!
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-amber-700 text-sm group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                <span>Start Learning Adventure</span>
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-2xl">🦁</span>
            </div>
          </div>

          {/* Teacher Portal Card */}
          <div
            onClick={handleTeacherClick}
            className="group relative bg-white rounded-4xl p-8 border-4 border-sky-300 hover:border-sky-400 shadow-bouncy hover:shadow-2xl transition-all cursor-pointer text-left flex flex-col justify-between overflow-hidden transform hover:-translate-y-1.5"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-sky-100 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-sky-500 text-white flex items-center justify-center text-3xl shadow-pop-blue mb-6 transform group-hover:-rotate-6 transition-transform">
                👩‍🏫
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-xs font-black uppercase tracking-wider mb-2 border border-sky-300">
                For Teachers &amp; Educators
              </div>

              <h2 className="text-3xl font-black font-display text-slate-800 mb-2 group-hover:text-sky-600 transition-colors">
                I am a Teacher!
              </h2>

              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                Manage curriculum with cascading tags (Class &rarr; Subject &rarr; Unit), upload materials, and inspect real-time student activity logs.
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-sky-700 text-sm group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                <span>Open Educator Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        {/* Feature Badges Grid */}
        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-4 bg-white/80 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <div className="text-xs font-black text-slate-800">PDF Reader</div>
              <div className="text-[11px] text-slate-500">Kid-safe preview</div>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <div>
              <div className="text-xs font-black text-slate-800">HTML5 Games</div>
              <div className="text-[11px] text-slate-500">Sandboxed frame</div>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div>
              <div className="text-xs font-black text-slate-800">Media Lessons</div>
              <div className="text-[11px] text-slate-500">Audio &amp; video</div>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <div className="text-xs font-black text-slate-800">Live Analytics</div>
              <div className="text-[11px] text-slate-500">Real-time tracker</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-400 font-medium">
        <p>GS Portal &bull; Kid-Friendly Educational File &amp; Resource Hub &bull; Built with Next.js &amp; SQLite</p>
      </footer>
    </div>
  );
}
