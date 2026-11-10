'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Cloud,
  Database,
  HardDrive,
  FileText,
  ShieldCheck,
  School,
  ArrowRight,
  ExternalLink,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FileUpload from '@/components/FileUpload';
import FileList from '@/components/FileList';
import { UploadedFile, User } from '@/lib/types';
import { formatBytes } from '@/lib/download-utils';
import { sounds } from '@/components/sound-effects';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Check auth user
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

  // Load uploaded files from /api/files
  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUploadSuccess = (newFile: UploadedFile) => {
    setFiles((prev) => [newFile, ...prev]);
  };

  const handleFileDeleted = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Compute metrics
  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const uniqueMimeTypes = new Set(files.map((f) => f.mime_type)).size;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50/50 bg-polka">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 rounded-4xl p-6 sm:p-10 text-white shadow-bouncy relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Supabase Storage &amp; Next.js App Router</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-tight">
              Modern File Management Portal
            </h1>

            <p className="text-xs sm:text-sm text-sky-100 font-medium leading-relaxed">
              Upload any file type without restriction. Open and inspect files in a new browser tab with native MIME rendering (PDFs, HTML5 apps, media, and code), and download with exact original names and extensions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                <Cloud className="w-3.5 h-3.5 text-sky-200" />
                <span>Bucket: <strong className="text-white">portal-files</strong></span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/15 px-3 py-1 rounded-xl border border-white/20">
                <Database className="w-3.5 h-3.5 text-purple-200" />
                <span>Table: <strong className="text-white">uploaded_files</strong></span>
              </span>
            </div>
          </div>

          {/* Quick Classroom Portal Navigation link */}
          <div className="relative z-10 flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
            <Link
              href="/student/portal"
              onClick={() => sounds.fanfare()}
              className="btn-bouncy px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm shadow-pop-yellow flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>🎒 Student Learning Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/teacher/dashboard"
              onClick={() => sounds.pop()}
              className="btn-bouncy px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black text-xs sm:text-sm backdrop-blur-md border border-white/30 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>👩‍🏫 Educator Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl shadow-inner">
              📁
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Files</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-display">{totalFiles}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner">
              💾
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage Used</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-display">{formatBytes(totalBytes)}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner">
              🧬
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">MIME Types</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-display">{uniqueMimeTypes} Types</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">MIME Delivery</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-display">Inline / Direct</h3>
            </div>
          </div>
        </div>

        {/* 1. File Upload Zone */}
        <FileUpload onUploadSuccess={handleUploadSuccess} />

        {/* 2. File Explorer & Table View */}
        <FileList
          files={files}
          loading={loading}
          onFileDeleted={handleFileDeleted}
          onRefresh={loadFiles}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <span>🎒 GS Portal &bull; Supabase Storage + Database</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Storage Connected
            </span>
            <span>RLS Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
