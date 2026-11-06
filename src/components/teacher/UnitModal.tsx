'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { SubjectItem } from '@/lib/types';
import { sounds } from '../sound-effects';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  initialSubjectId?: string;
  onSuccess: () => void;
}

export default function UnitModal({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  onSuccess,
}: UnitModalProps) {
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId || subjects[0]?.id || '');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialSubjectId) setSubjectId(initialSubjectId);
    else if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
  }, [subjects, initialSubjectId, subjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a unit name.');
      return;
    }
    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create unit');

      sounds.star();
      setName('');
      setDescription('');
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
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-300">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg font-bold font-display">Add Unit / Topic</h2>
              <p className="text-xs text-amber-100">Chapter or learning module</p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.pop();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-6 h-6" />
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon || '📚'} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Chapter Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unit 1: Solar System Planets"
              className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Short Description <span className="text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Exploring the 8 planets and stars in our universe."
              className="w-full text-xs font-medium bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-bouncy w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-pop-yellow flex items-center justify-center gap-2 mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Unit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
