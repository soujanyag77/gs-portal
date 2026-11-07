'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { sounds } from '@/components/sound-effects';
import { fireConfetti } from '@/components/ConfettiCelebration';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      if (data.token) {
        try {
          localStorage.setItem('portal_token', data.token);
        } catch {}
      }

      sounds.fanfare();
      fireConfetti();
      router.push('/teacher/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    sounds.pop();
    setEmail('teacher@school.edu');
    setPassword('teacher123');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-purple-50 bg-polka">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-4xl p-8 border-4 border-purple-200 shadow-bouncy">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-3xl bg-purple-500 text-white flex items-center justify-center text-3xl mx-auto shadow-pop-purple mb-4">
              👩‍🏫
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-800">
              Educator Portal Login
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sign in to manage classes, files, and view student analytics.
            </p>
          </div>

          {/* Quick Demo Fill Pill */}
          <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-xs text-purple-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span>Default: <strong>teacher@school.edu</strong></span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-extrabold bg-purple-600 text-white px-2.5 py-1 rounded-xl shadow-sm hover:bg-purple-700 transition-colors"
            >
              Fill Credentials
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  className="w-full text-xs font-bold pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs font-bold pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-pop-purple flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Checking credentials...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Access Teacher Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Student Login */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/student/login"
              onClick={() => sounds.pop()}
              className="text-xs font-extrabold text-sky-600 hover:underline flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Are you a student? Click here for Student Access</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
