'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Users,
  School,
  Sparkles,
  AlertCircle,
  Key,
  FileText,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import { ClassItem, User } from '@/lib/types';
import { parseFileInfo, ParsedFileInfo } from '@/lib/filename-parser';
import { safeFetchJson } from '@/lib/api-client';
import { sounds } from '../sound-effects';
import { fireConfetti } from '../ConfettiCelebration';

export const GRADE_LEVEL_OPTIONS = [
  { value: 'Pre-K', label: 'Pre-K', icon: '🧸', color: '#fb923c' },
  { value: 'Nursery', label: 'Nursery', icon: '🧸', color: '#fb923c' },
  { value: 'LKG', label: 'LKG (Lower Kindergarten)', icon: '🧸', color: '#fb923c' },
  { value: 'UKG', label: 'UKG (Upper Kindergarten)', icon: '🧸', color: '#fb923c' },
  { value: 'Kindergarten', label: 'Kindergarten', icon: '🧸', color: '#fb923c' },
  { value: 'Grade 1', label: 'Grade 1 (Class I)', icon: '🎒', color: '#38bdf8' },
  { value: 'Grade 2', label: 'Grade 2 (Class II)', icon: '🚀', color: '#a855f7' },
  { value: 'Grade 3', label: 'Grade 3 (Class III)', icon: '🌟', color: '#facc15' },
  { value: 'Grade 4', label: 'Grade 4 (Class IV)', icon: '🦁', color: '#4ade80' },
  { value: 'Grade 5', label: 'Grade 5 (Class V)', icon: '🔬', color: '#ec4899' },
  { value: 'Grade 6', label: 'Grade 6 (Class VI)', icon: '🧭', color: '#06b6d4' },
  { value: 'Grade 7', label: 'Grade 7 (Class VII)', icon: '⚡', color: '#f97316' },
  { value: 'Grade 8', label: 'Grade 8 (Class VIII)', icon: '🏆', color: '#8b5cf6' },
  { value: 'Grade 9', label: 'Grade 9 (Class IX)', icon: '🔭', color: '#3b82f6' },
  { value: 'Grade 10', label: 'Grade 10 (Class X)', icon: '🎓', color: '#10b981' },
  { value: 'Grade 11', label: 'Grade 11 (Class XI)', icon: '🏛️', color: '#6366f1' },
  { value: 'Grade 12', label: 'Grade 12 (Class XII)', icon: '👑', color: '#e11d48' },
];

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
  const [activeTab, setActiveTab] = useState<'classes' | 'students' | 'from-file'>('classes');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const classNameInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronized Local Classes State for instant UI responsiveness
  const [localClasses, setLocalClasses] = useState<ClassItem[]>(classes);

  useEffect(() => {
    setLocalClasses(classes);
  }, [classes]);

  // New Class Form State
  const [className, setClassName] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('Grade 1');
  const [classIcon, setClassIcon] = useState<string>('🎒');
  const [classColor, setClassColor] = useState<string>('#38bdf8');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // From-File Form State
  const [fileNameInput, setFileNameInput] = useState<string>('Grade 2 - Science - Solar System.pdf');
  const [parsedFromFile, setParsedFromFile] = useState<ParsedFileInfo | null>(null);
  const [fileActionSuccess, setFileActionSuccess] = useState<string>('');

  // New Student Form State
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [studentName, setStudentName] = useState<string>('');
  const [studentPin, setStudentPin] = useState<string>('1234');
  const [studentAvatar, setStudentAvatar] = useState<string>('🦊');
  const [students, setStudents] = useState<User[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const avatarOptions = ['🦊', '🐼', '🦁', '🐨', '🐯', '🐰', '🐸', '🦄', '🚀', '⭐', '🦖', '🎨'];
  const iconOptions = ['🎒', '🚀', '🌟', '🏰', '🌈', '🦁', '🌿', '🎨', '🔬', '🪐', '🧭', '⚡', '🏆', '🔭', '🎓', '👑'];
  const colorOptions = ['#38bdf8', '#a855f7', '#f472b6', '#4ade80', '#fb923c', '#facc15', '#10b981', '#06b6d4', '#6366f1', '#e11d48'];

  useEffect(() => {
    if (localClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(localClasses[0].id);
    }
  }, [localClasses, selectedClassId]);

  // Parse filename whenever fileNameInput changes
  useEffect(() => {
    if (fileNameInput.trim()) {
      const parsed = parseFileInfo(fileNameInput.trim());
      setParsedFromFile(parsed);
    } else {
      setParsedFromFile(null);
    }
  }, [fileNameInput]);

  // Load students for active class
  useEffect(() => {
    if (!selectedClassId) return;
    async function loadStudents() {
      try {
        const data = await safeFetchJson(`/api/students?class_id=${selectedClassId}`);
        setStudents(data.students || []);
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  if (!isOpen) return null;

  const handleGradeLevelChange = (selectedVal: string) => {
    sounds.pop();
    setGradeLevel(selectedVal);
    const matched = GRADE_LEVEL_OPTIONS.find((g) => g.value === selectedVal);
    if (matched) {
      setClassIcon(matched.icon);
      setClassColor(matched.color);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      sounds.pop();
      setError('Please provide a class name (e.g. "Grade 10 - Mathematics" or "Class XII - Section A").');
      classNameInputRef.current?.focus();
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const data = await safeFetchJson('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className.trim(),
          grade_level: gradeLevel,
          icon: classIcon,
          color: classColor,
        }),
      });

      sounds.fanfare();
      fireConfetti();

      const createdClass: ClassItem = data.class || {
        id: 'cls_' + Date.now(),
        name: className.trim(),
        grade_level: gradeLevel,
        icon: classIcon,
        color: classColor,
      };

      setSuccessMessage(
        `🎉 Classroom "${createdClass.name}" (${createdClass.grade_level}) created successfully!`
      );

      // Optimistically insert into local class roster immediately
      setLocalClasses((prev) => [createdClass, ...prev.filter((c) => c.id !== createdClass.id)]);
      setClassName('');
      onRefresh();
    } catch (err: any) {
      console.error('Create class error:', err);
      sounds.pop();
      setError(err.message || 'Failed to create classroom. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionTechClasses = async () => {
    setError('');
    setLoading(true);
    setSuccessMessage('');

    try {
      const data = await safeFetchJson('/api/classes/provision-tech', {
        method: 'POST',
      });

      sounds.fanfare();
      fireConfetti();
      setSuccessMessage(
        `🎉 Successfully configured standard tech classes (X A AI, X B AI, XI AI, XI CS, XII AI, XII CS)!`
      );

      if (data.classes) {
        setLocalClasses(data.classes);
      }
      onRefresh();
    } catch (err: any) {
      console.error('Provision tech classes error:', err);
      sounds.pop();
      setError(err.message || 'Failed to provision standard tech classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNameInput.trim()) {
      sounds.pop();
      setError('Please enter or select a filename.');
      return;
    }
    setError('');
    setLoading(true);
    setFileActionSuccess('');

    try {
      const data = await safeFetchJson('/api/classes/from-filename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileNameInput.trim(),
          createHierarchy: true,
        }),
      });

      sounds.fanfare();
      fireConfetti();
      setFileActionSuccess(
        `Class "${data.class.name}" (${data.class.grade_level}) successfully ${
          data.action === 'created' ? 'created' : 'matched/updated'
        } as per file name information!`
      );

      if (data.class) {
        setLocalClasses((prev) => [data.class, ...prev.filter((c) => c.id !== data.class.id)]);
      }

      onRefresh();
    } catch (err: any) {
      console.error('File class creation error:', err);
      sounds.pop();
      setError(err.message || 'Failed to process class from filename');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileNameInput(e.dataTransfer.files[0].name);
      sounds.pop();
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      sounds.pop();
      setError('Please enter the student’s name.');
      return;
    }
    if (!selectedClassId) {
      sounds.pop();
      setError('Please select a class for this student.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await safeFetchJson('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName.trim(),
          class_id: selectedClassId,
          pin: studentPin.trim(),
          avatar: studentAvatar,
        }),
      });

      sounds.star();
      setStudentName('');
      const stuData = await safeFetchJson(`/api/students?class_id=${selectedClassId}`);
      setStudents(stuData.students || []);
      onRefresh();
    } catch (err: any) {
      console.error('Student creation error:', err);
      sounds.pop();
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This removes its subjects and students.`)) return;
    setError('');
    try {
      await safeFetchJson(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      sounds.pop();
      setLocalClasses((prev) => prev.filter((c) => c.id !== id && c.name.toLowerCase() !== name.toLowerCase()));
      setSuccessMessage(`Class "${name}" has been deleted.`);
      onRefresh();
    } catch (err: any) {
      console.warn('Initial delete by id notice, trying fallback by name:', err);
      try {
        await safeFetchJson(`/api/classes/${encodeURIComponent(name)}`, { method: 'DELETE' });
        sounds.pop();
        setLocalClasses((prev) => prev.filter((c) => c.id !== id && c.name.toLowerCase() !== name.toLowerCase()));
        setSuccessMessage(`Class "${name}" has been deleted.`);
        onRefresh();
        return;
      } catch (err2: any) {
        console.error('Delete class error:', err2);
        setError(err2.message || err.message || 'Failed to delete class');
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await safeFetchJson(`/api/students/${id}`, { method: 'DELETE' });
      sounds.pop();
      setStudents(students.filter((s) => s.id !== id));
      onRefresh();
    } catch (err: any) {
      console.error('Delete student error:', err);
      setError(err.message || 'Failed to delete student');
    }
  };

  // Check if detected class already exists
  const detectedExists =
    parsedFromFile &&
    localClasses.some(
      (c) => c.name.toLowerCase() === (parsedFromFile.className || '').toLowerCase()
    );

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
              <h2 className="text-xl font-bold font-display leading-tight">Class &amp; Student Manager</h2>
              <p className="text-xs text-emerald-100 font-medium">
                Set up classrooms manually, enroll students, or auto-configure from file names
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

        {/* Triple Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              sounds.pop();
              setActiveTab('classes');
            }}
            className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'classes'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Manage Classes ({localClasses.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setActiveTab('from-file');
            }}
            className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'from-file'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-500" />
            <span>From File Name ✨</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setActiveTab('students');
            }}
            className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'students'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Roster</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-pop">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-pop">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {fileActionSuccess && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-pop">
            <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>{fileActionSuccess}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'from-file' ? (
            /* Create or Update from File Name Tab */
            <div className="space-y-6">
              <form
                onSubmit={handleCreateOrUpdateFromFile}
                className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-3xl border-2 border-amber-300 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h3 className="text-sm font-black text-amber-900 font-display">
                      Create or Update Class as per File Information
                    </h3>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Enter any resource filename or drop a file. The portal extracts the Class, Grade Level, and suggested Icon/Color automatically!
                    </p>
                  </div>
                </div>

                {/* Dropzone / Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    File Name (or drop file below):
                  </label>
                  <input
                    type="text"
                    required
                    value={fileNameInput}
                    onChange={(e) => setFileNameInput(e.target.value)}
                    placeholder="e.g. Grade 1 - Science - Solar System.pdf or Class 3_Math.docx"
                    className="w-full text-xs font-bold bg-white border-2 border-amber-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Optional File Picker */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white/80 border-2 border-dashed border-amber-300 rounded-2xl text-center cursor-pointer hover:bg-white transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileNameInput(e.target.files[0].name);
                        sounds.pop();
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-800">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Drop any file here or click to select from computer</span>
                  </div>
                </div>

                {/* Parsed Result Preview */}
                {parsedFromFile && (
                  <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Extracted Class Information:
                    </span>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-inner"
                        style={{ backgroundColor: `${parsedFromFile.classColor}25` }}
                      >
                        {parsedFromFile.classIcon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                          <span>{parsedFromFile.className || 'Grade 1'}</span>
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: parsedFromFile.classColor }}
                          >
                            {parsedFromFile.gradeLevel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {detectedExists ? (
                            <span className="text-amber-600 font-bold">
                              ⚡ Class already exists in your school &mdash; will update details &amp; hierarchy
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">
                              ✨ New class will be created in your school roster
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {parsedFromFile.subjectName && (
                      <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center gap-1.5">
                        <span>Also configures:</span>
                        <strong className="text-purple-700">📚 {parsedFromFile.subjectName}</strong>
                        <span>&bull;</span>
                        <strong className="text-amber-800">📖 {parsedFromFile.unitName}</strong>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !fileNameInput.trim()}
                  className="btn-bouncy w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-pop-yellow flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-4 h-4 text-amber-100" />
                  <span>
                    {loading
                      ? 'Processing...'
                      : detectedExists
                      ? 'Update Class as per File Information'
                      : 'Create Class as per File Information'}
                  </span>
                </button>
              </form>
            </div>
          ) : activeTab === 'classes' ? (
            <div className="space-y-6">
              {/* Quick Provision Standard Tech Classes Banner */}
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 rounded-3xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-indigo-200">
                <div>
                  <div className="text-xs font-black flex items-center gap-1.5 mb-0.5">
                    <span className="text-base">⚡</span>
                    <span>Standard Tech Classes: X A AI, X B AI, XI AI, XI CS, XII AI, XII CS</span>
                  </div>
                  <p className="text-[11px] text-indigo-100 font-medium">
                    1-Click instant configuration with class sections and AI / CS subjects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleProvisionTechClasses}
                  disabled={loading}
                  className="btn-bouncy px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black rounded-xl shadow-xs whitespace-nowrap self-stretch sm:self-auto text-center"
                >
                  ⚡ Provision 6 Classes
                </button>
              </div>

              {/* Create Class Form */}
              <form
                onSubmit={handleCreateClass}
                className="bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 space-y-4"
              >
                <span className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Add New Classroom
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Class Name <span className="text-emerald-600">*</span>
                    </label>
                    <input
                      ref={classNameInputRef}
                      type="text"
                      value={className}
                      onChange={(e) => {
                        setClassName(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder={`e.g. ${gradeLevel} - Space Explorers or Class XII - Physics`}
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
                    />

                    {/* Quick Suggestions for fast setup */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setClassName(gradeLevel);
                        }}
                        className="text-[10px] font-extrabold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        {gradeLevel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setClassName(`${gradeLevel} - Section A`);
                        }}
                        className="text-[10px] font-extrabold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        {gradeLevel} - Section A
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setClassName(`${gradeLevel} - Explorers`);
                        }}
                        className="text-[10px] font-extrabold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        {gradeLevel} - Explorers
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grade Level (Up to Class XII)</label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => handleGradeLevelChange(e.target.value)}
                      className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none cursor-pointer"
                    >
                      {GRADE_LEVEL_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.icon} {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Icon & Color selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-600 mr-1">Icon:</span>
                    {iconOptions.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setClassIcon(ic)}
                        className={`text-lg p-1 rounded-xl transition-all ${
                          classIcon === ic
                            ? 'bg-white shadow-sm ring-2 ring-emerald-400 scale-110'
                            : 'opacity-70'
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
                  disabled={loading}
                  className={`btn-bouncy w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                    loading
                      ? 'bg-slate-300 text-slate-500 cursor-wait'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-pop-green cursor-pointer'
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Classroom...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>+ Create Classroom</span>
                    </>
                  )}
                </button>
              </form>

              {/* Class List */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Existing Classes ({localClasses.length})
                </h4>
                {localClasses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No classes created yet. Add one above!</p>
                ) : (
                  <div className="space-y-2">
                    {localClasses.map((cls) => (
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
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{cls.grade_level}</span>
                              <span>&bull;</span>
                              <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                📁 {cls.resource_count || 0} {cls.resource_count === 1 ? 'file' : 'files'}
                              </span>
                              <span>&bull;</span>
                              <span>{cls.student_count || 0} students</span>
                              <span>&bull;</span>
                              <span>{cls.subject_count || 0} subjects</span>
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
                  {localClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🎒'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-Registration Notice for Teachers */}
              <div className="bg-sky-50 border-2 border-sky-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-sky-900 shadow-sm">
                <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>
                  <strong>Tip:</strong> Students can directly sign in from the Student Portal by entering their Full Name and selecting their Class. Manual pre-enrollment here is optional!
                </span>
              </div>

              {/* Add Student Form */}
              <form
                onSubmit={handleCreateStudent}
                className="bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 space-y-4"
              >
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      4-Digit PIN (Easy for Kids)
                    </label>
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
                  <span className="block text-xs font-bold text-slate-700 mb-1.5">
                    Choose Animal Avatar:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {avatarOptions.map((av) => (
                      <button
                        type="button"
                        key={av}
                        onClick={() => setStudentAvatar(av)}
                        className={`text-2xl p-1.5 rounded-2xl transition-all ${
                          studentAvatar === av
                            ? 'bg-white shadow-md ring-3 ring-emerald-400 scale-110'
                            : 'opacity-60 hover:opacity-100'
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
                  <p className="text-xs text-slate-400 italic">
                    No students enrolled in this class yet. Add one above!
                  </p>
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
