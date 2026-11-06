'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { ClassItem, SubjectItem } from '@/lib/types';
import { sounds } from '../sound-effects';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  initialClassId?: string;
  onSuccess: () => void;
}

export default function SubjectModal({
  isOpen,
  onClose,
  classes,
  initialClassId,
  onSuccess,
}: SubjectModalProps) {
  const [classId, setClassId] = useState<string>(initialClassId || classes[0]?.id || '');
  const [name, setName] = useState<string>('');
  const [colorCode, setColorCode] = useState<string>('#38bdf8');
  const [icon, setIcon] = useState<string>('📚');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const icons = ['📚', '🧪', '📐', '🎨', '🌍', '🎵', '💻', '⚽', '🚀', '🌱'];
  const colors = ['#38bdf8', '#a855f7', '#f472b6', '#4ade80', '#fb923c', '#facc15', '#06b6d4', '#e11d48'];

  useEffect(() => {
    if (initialClassId) setClassId(initialClassId);
    else if (classes.length > 0 && !classId) setClassId(classes[0].id);
  }, [classes, initialClassId, classId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a subject name.');
      return;
    }
    if (!classId) {
      setError('Please select a class.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          name: name.trim(),
          color_code: colorCode,
          icon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create subject');

      sounds.star();
      setName('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-pop">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-4 border-indigo-300">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h2 className="text-lg font-bold font-display">Add New Subject</h2>
              <p className="text-xs text-indigo-100">Math, Science, Reading, Art...</p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.pop();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '🎒'} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Science & Discovery"
              className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pick Icon</label>
            <div className="flex flex-wrap gap-2">
              {icons.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`text-xl p-2 rounded-xl transition-all ${
                    icon === ic ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110' : 'bg-slate-100 opacity-60'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pick Theme Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColorCode(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-all ${
                    colorCode === c ? 'ring-3 ring-slate-800 scale-110' : 'opacity-70'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-bouncy w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs shadow-pop-purple flex items-center justify-center gap-2 mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Subject</span>
          </button>
        </form>
      </div>
    </div>
  );
}
