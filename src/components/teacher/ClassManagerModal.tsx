'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, School, Sparkles, AlertCircle, Key } from 'lucide-react';
import { ClassItem, User } from '@/lib/types';
import { sounds } from '../sound-effects';

interface ClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  onRefresh: () => void;
}

export default function ClassManagerModal({
  isOpen,
  onClose,
  classes,
  onRefresh,
}: ClassManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'classes' | 'students'>('classes');

  // New Class Form State
  const [className, setClassName] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('Grade 1');
  const [classIcon, setClassIcon] = useState<string>('🎒');
  const [classColor, setClassColor] = useState<string>('#38bdf8');

  // New Student Form State
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [studentName, setStudentName] = useState<string>('');
  const [studentPin, setStudentPin] = useState<string>('1234');
  const [studentAvatar, setStudentAvatar] = useState<string>('🦊');
  const [students, setStudents] = useState<User[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const avatarOptions = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐰', '🐸', '🦄', '🚀', '⭐', '🦖', '🎨'];
  const iconOptions = ['🎒', '🚀', '🌟', '🏰', '🌈', '🦁', '🌿', '🎨'];
  const colorOptions = ['#38bdf8', '#a855f7', '#f472b6', '#4ade80', '#fb923c', '#facc15'];

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Load students for active class
  useEffect(() => {
    if (!selectedClassId) return;
    async function loadStudents() {
      try {
        const res = await fetch(`/api/students?class_id=${selectedClassId}`);
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  if (!isOpen) return null;

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setError('Please provide a class name.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className.trim(),
          grade_level: gradeLevel,
          icon: classIcon,
          color: classColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create class');

      sounds.fanfare();
      setClassName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('Please enter the student’s name.');
      return;
    }
    if (!selectedClassId) {
      setError('Please select a class for this student.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName.trim(),
          class_id: selectedClassId,
          pin: studentPin.trim(),
          avatar: studentAvatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add student');

      sounds.star();
      setStudentName('');
      // Reload students
      const stuRes = await fetch(`/api/students?class_id=${selectedClassId}`);
      const stuData = await stuRes.json();
      setStudents(stuData.students || []);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This removes its subjects and students.`)) return;
    try {
      await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      sounds.pop();
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
      sounds.pop();
      setStudents(students.filter((s) => s.id !== id));
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-pop">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-4 border-emerald-300 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              🏫
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">Class & Student Manager</h2>
              <p className="text-xs text-emerald-100 font-medium">
                Set up classrooms and add eager young learners
              </p>
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

        {/* Dual Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3">
          <button
            onClick={() => {
              sounds.pop();
              setActiveTab('classes');
            }}
            className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'classes'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Manage Classes ({classes.length})</span>
          </button>
          <button
            onClick={() => {
              sounds.pop();
              setActiveTab('students');
            }}
            className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'students'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Add / Manage Students</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'classes' ? (
            <div className="space-y-6">
              {/* Create Class Form */}
              <form onSubmit={handleCreateClass} className="bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 space-y-4">
                <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Add New Classroom
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Class Name</label>
                    <input
                      type="text"
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="e.g. 1st Grade - Space Explorers"
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grade Level</label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                    </select>
                  </div>
                </div>

                {/* Icon & Color selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600 mr-1">Icon:</span>
                    {iconOptions.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setClassIcon(ic)}
                        className={`text-lg p-1 rounded-xl transition-all ${
                          classIcon === ic ? 'bg-white shadow-sm ring-2 ring-emerald-400 scale-110' : 'opacity-70'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600 mr-1">Color:</span>
                    {colorOptions.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setClassColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-all ${
                          classColor === c ? 'ring-2 ring-slate-800 scale-110' : 'opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !className.trim()}
                  className="btn-bouncy w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-pop-green flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Classroom</span>
                </button>
              </form>

              {/* Class List */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Existing Classes ({classes.length})
                </h4>
                {classes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No classes created yet. Add one above!</p>
                ) : (
                  <div className="space-y-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                            style={{ backgroundColor: `${cls.color}25`, border: `2px solid ${cls.color}` }}
                          >
                            {cls.icon || '🎒'}
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-slate-800">{cls.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {cls.grade_level} • {cls.student_count || 0} students • {cls.subject_count || 0} subjects
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Student Manager Tab */
            <div className="space-y-6">
              {/* Class Selector for Students */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-extrabold text-slate-700">Class:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="flex-1 text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🎒'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Student Form */}
              <form onSubmit={handleCreateStudent} className="bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 space-y-4">
                <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Enroll New Student
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student First Name</label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Toby"
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">4-Digit PIN (Easy for Kids)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={studentPin}
                      onChange={(e) => setStudentPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none tracking-widest text-center"
                    />
                  </div>
                </div>

                {/* Avatar Picker */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">Choose Animal Avatar:</span>
                  <div className="flex flex-wrap gap-2">
                    {avatarOptions.map((av) => (
                      <button
                        type="button"
                        key={av}
                        onClick={() => setStudentAvatar(av)}
                        className={`text-2xl p-1.5 rounded-2xl transition-all ${
                          studentAvatar === av ? 'bg-white shadow-md ring-3 ring-emerald-400 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !studentName.trim() || !selectedClassId}
                  className="btn-bouncy w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-pop-green flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
              </form>

              {/* Enrolled Students Roster */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Enrolled Students ({students.length})
                </h4>
                {students.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No students enrolled in this class yet. Add one above!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students.map((stu) => (
                      <div
                        key={stu.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{stu.avatar || '🦊'}</span>
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">{stu.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                              <Key className="w-3 h-3 text-slate-400" /> PIN: {stu.pin || 'None'} • ⭐ {stu.stars || 0}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteStudent(stu.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                          title="Remove student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
