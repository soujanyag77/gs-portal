'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  CheckCircle,
  FileText,
  AlertCircle,
  FolderPlus,
  HelpCircle,
} from 'lucide-react';
import { ClassItem, SubjectItem, UnitItem, FileType } from '@/lib/types';
import { detectFileType, FILE_TYPE_MAP, formatFileSize } from '@/lib/file-types';
import { sounds } from '../sound-effects';
import { fireConfetti } from '../ConfettiCelebration';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  classes: ClassItem[];
  initialClassId?: string;
  initialSubjectId?: string;
  initialUnitId?: string;
}

export default function FileUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  classes,
  initialClassId,
  initialSubjectId,
  initialUnitId,
}: FileUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cascading selector state
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || '');

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  // File & form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [detectedType, setDetectedType] = useState<FileType | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Update selected class when classes load
  useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    } else if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, initialClassId, selectedClassId]);

  // Fetch subjects whenever class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }

    async function loadSubjects() {
      try {
        const res = await fetch(`/api/subjects?class_id=${selectedClassId}`);
        const data = await res.json();
        setSubjects(data.subjects || []);
        if (data.subjects?.length > 0) {
          const match = initialSubjectId && data.subjects.some((s: any) => s.id === initialSubjectId);
          setSelectedSubjectId(match ? (initialSubjectId as string) : data.subjects[0].id);
        } else {
          setSelectedSubjectId('');
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    loadSubjects();
  }, [selectedClassId, initialSubjectId]);

  // Fetch units whenever subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      setSelectedUnitId('');
      return;
    }

    async function loadUnits() {
      try {
        const res = await fetch(`/api/units?subject_id=${selectedSubjectId}`);
        const data = await res.json();
        setUnits(data.units || []);
        if (data.units?.length > 0) {
          const match = initialUnitId && data.units.some((u: any) => u.id === initialUnitId);
          setSelectedUnitId(match ? (initialUnitId as string) : data.units[0].id);
        } else {
          setSelectedUnitId('');
        }
      } catch (err) {
        console.error('Failed to load units:', err);
      }
    }
    loadUnits();
  }, [selectedSubjectId, initialUnitId]);

  if (!isOpen) return null;

  const handleFileChange = (chosenFile: File | null) => {
    if (!chosenFile) return;
    setFile(chosenFile);
    setError('');

    // Pre-populate title if empty
    if (!title) {
      const baseName = chosenFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }

    const type = detectFileType(chosenFile.name, chosenFile.type);
    setDetectedType(type);
    sounds.pop();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please choose or drop a file to upload.');
      return;
    }
    if (!selectedClassId) {
      setError('Please select a Class.');
      return;
    }
    if (!selectedSubjectId) {
      setError('Please select a Subject. If none exist, create one first!');
      return;
    }
    if (!selectedUnitId) {
      setError('Please select a Unit/Topic for this file.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title for this resource.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('unit_id', selectedUnitId);
      formData.append('title', title.trim());
      formData.append('description', description.trim());

      const res = await fetch('/api/resources', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload file.');
      }

      sounds.fanfare();
      fireConfetti();
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  const typeInfo = detectedType ? FILE_TYPE_MAP[detectedType] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-pop">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-4 border-sky-300 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📤
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">Upload Learning Resource</h2>
              <p className="text-xs text-sky-100 font-medium">
                Organize with cascading Class &rarr; Subject &rarr; Unit tags
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cascading Selectors */}
          <div className="bg-sky-50/70 p-4 rounded-3xl border-2 border-sky-200 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-sky-600" />
              1. Hierarchical Organization (Cascading Selectors)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Class Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class / Grade</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    sounds.pop();
                  }}
                  className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Select Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🎒'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    sounds.pop();
                  }}
                  disabled={!selectedClassId || subjects.length === 0}
                  className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {subjects.length === 0 ? 'No subjects in class' : 'Select Subject...'}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon || '📚'} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Chapter</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    sounds.pop();
                  }}
                  disabled={!selectedSubjectId || units.length === 0}
                  className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {units.length === 0 ? 'No units in subject' : 'Select Unit...'}
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      📖 {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(!selectedClassId || subjects.length === 0 || units.length === 0) && (
              <p className="text-[11px] text-amber-700 font-medium">
                💡 Tip: Make sure your chosen class has at least one Subject and Unit created! You can add them in Content Manager.
              </p>
            )}
          </div>

          {/* Drag & Drop File Picker */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              2. Select File (Automatic Type Detection)
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-sky-500 bg-sky-50 scale-[1.01]'
                  : file
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/70 hover:bg-sky-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-2">
                    {typeInfo ? typeInfo.emoji : '📄'}
                  </div>
                  <div className="text-sm font-extrabold text-slate-800 break-all max-w-sm">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {formatFileSize(file.size)}
                  </div>

                  {typeInfo && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border bg-white shadow-sm">
                      <span>Detected:</span>
                      <span className={`px-2 py-0.5 rounded-full ${typeInfo.badgeBg} ${typeInfo.badgeColor}`}>
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                    </div>
                  )}

                  <span className="text-[11px] text-sky-600 font-bold mt-3 hover:underline">
                    Click to change file
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    📁
                  </div>
                  <p className="text-sm font-extrabold text-slate-700 mb-1">
                    Drag and drop your file here, or{' '}
                    <span className="text-sky-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 font-medium max-w-md">
                    Supports PDFs, HTML5 interactive games (.html / .zip packages), Images, Audio (MP3), Videos (MP4), and Documents (DOCX/PPTX).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resource Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Planets of our Solar System Activity"
                className="w-full text-sm font-bold bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 focus:border-sky-500 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fun Short Description / Teacher Note <span className="text-slate-400">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Listen carefully to the story and color the worksheet planets!"
                className="w-full text-xs font-medium bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !file || !selectedUnitId}
              className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-pop-blue flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Uploading & Processing...</span>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Publish to Class Library</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
