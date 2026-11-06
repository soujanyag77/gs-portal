'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderGit2, BarChart2, Plus, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ContentManager from '@/components/teacher/ContentManager';
import StudentAnalytics from '@/components/teacher/StudentAnalytics';
import { ClassItem, User } from '@/lib/types';
import { sounds } from '@/components/sound-effects';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'content' | 'analytics'>('content');
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function checkAuthAndLoadClasses() {
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/teacher/login');
        return;
      }
      const authData = await authRes.json();
      if (authData.user?.role !== 'teacher') {
        router.push('/teacher/login');
        return;
      }
      setUser(authData.user);

      const clsRes = await fetch('/api/classes');
      const clsData = await clsRes.json();
      setClasses(clsData.classes || []);
    } catch (err) {
      router.push('/teacher/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuthAndLoadClasses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-display text-lg">
        Loading Educator Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 bg-polka">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs (Content Manager vs Student Analytics) */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sounds.pop();
                setActiveTab('content');
              }}
              className={`btn-bouncy px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'content'
                  ? 'bg-sky-500 text-white shadow-pop-blue'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Content Manager</span>
            </button>

            <button
              onClick={() => {
                sounds.pop();
                setActiveTab('analytics');
              }}
              className={`btn-bouncy px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-pop-purple'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-2 border-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Student Analytics</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Welcome, {user?.name || 'Teacher'}!</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'content' ? (
          <ContentManager />
        ) : (
          <StudentAnalytics classes={classes} />
        )}
      </main>
    </div>
  );
}
