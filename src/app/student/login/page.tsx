'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, School, User as UserIcon, BookOpen, AlertCircle, Compass } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { ClassItem } from '@/lib/types';
import { sounds } from '@/components/sound-effects';
import { fireConfetti } from '@/components/ConfettiCelebration';
import { safeFetchJson } from '@/lib/api-client';

export default function StudentLoginPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [fullName, setFullName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🦊');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const avatarOptions = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐰', '🐸', '🦄', '🚀', '⭐', '🦖', '🎨'];

  // Load available classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const data = await safeFetchJson('/api/classes');
        const clsList: ClassItem[] = data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  const handleStartExploring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      sounds.pop();
      setError('Please enter your full name to start learning!');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const data = await safeFetchJson('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          classId: selectedClassId,
          avatar: selectedAvatar,
        }),
      });

      if (data.token) {
        try {
          localStorage.setItem('portal_token', data.token);
        } catch {}
      }

      sounds.fanfare();
      fireConfetti();
      router.push('/student/portal');
      router.refresh();
    } catch (err: any) {
      console.error('Student check-in error:', err);
      sounds.pop();
      setError(err.message || 'Could not sign in. Please try again!');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50 bg-polka">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg bg-white rounded-4xl p-6 sm:p-8 border-4 border-sky-300 shadow-bouncy">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-400 via-sky-500 to-indigo-500 text-white flex items-center justify-center text-4xl mx-auto shadow-pop-blue mb-4 animate-bounce-soft">
              {selectedAvatar}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-800">
              Welcome, Student! 🎒
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Enter your name &amp; select your class to unlock learning materials, games, and videos.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-pop">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleStartExploring} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-sky-500" />
                <span>Your Full Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Leo Watson or Aarav Sharma"
                className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:bg-white focus:border-sky-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <School className="w-4 h-4 text-amber-500" />
                  <span>Select Your Class</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  Up to Class XII
                </span>
              </label>

              {loading ? (
                <div className="w-full text-xs font-bold text-slate-400 bg-slate-100 rounded-2xl px-4 py-3">
                  Loading classrooms...
                </div>
              ) : classes.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                  🌟 No specific class set up yet. We will place you in the <strong>General Learning Classroom</strong>!
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      sounds.pop();
                      setSelectedClassId(e.target.value);
                    }}
                    className="w-full text-sm font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 focus:bg-white focus:border-sky-500 focus:outline-none cursor-pointer appearance-none transition-colors"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '🎒'} {c.name} {c.grade_level ? `(${c.grade_level})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    ▼
                  </div>
                </div>
              )}

              {/* Student Interest Info Note */}
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Compass className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>
                  <strong>Tip:</strong> Once inside, you can freely switch and explore materials from <em>any other class</em> as per your interests!
                </span>
              </div>
            </div>

            {/* Mascot Avatar Picker */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-2">
                Pick Your Learning Buddy (Mascot):
              </label>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => {
                      sounds.pop();
                      setSelectedAvatar(av);
                    }}
                    className={`text-2xl p-2 rounded-2xl transition-all flex items-center justify-center ${
                      selectedAvatar === av
                        ? 'bg-sky-100 ring-3 ring-sky-500 scale-110 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-bouncy w-full py-4 rounded-3xl bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-black text-sm shadow-pop-blue flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Entering Learning Library...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Let&apos;s Start Exploring! 🚀</span>
                </>
              )}
            </button>
          </form>

          {/* Teacher Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Are you an educator?</span>
            <Link
              href="/teacher/login"
              onClick={() => sounds.pop()}
              className="font-extrabold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline"
            >
              <span>Teacher Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
