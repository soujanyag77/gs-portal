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
  BookOpen,
  School,
  Folder,
  Layers,
} from 'lucide-react';
import { ClassItem, SubjectItem, UnitItem, FileType } from '@/lib/types';
import { detectFileType, FILE_TYPE_MAP, formatFileSize } from '@/lib/file-types';
import { parseFileInfo, ParsedFileInfo } from '@/lib/filename-parser';
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

const STANDARD_CLASS_PRESETS = [
  'X A AI',
  'X B AI',
  'XI AI',
  'XI CS',
  'XII AI',
  'XII CS',
];

const STANDARD_SUBJECT_PRESETS = [
  'Artificial Intelligence',
  'Computer Science',
  'Science',
  'Mathematics',
  'English',
  'Physics',
];

const STANDARD_UNIT_PRESETS = [
  'Unit 1 Introduction to AI',
  'Unit 2 Python Basics',
  'Unit 3 Machine Learning',
  'Unit 1',
  'Unit 2',
  'Unit 3',
];

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

  // Editable typed hierarchy inputs
  const [classNameInput, setClassNameInput] = useState<string>('');
  const [subjectNameInput, setSubjectNameInput] = useState<string>('');
  const [unitNameInput, setUnitNameInput] = useState<string>('');

  // File & form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [detectedType, setDetectedType] = useState<FileType | null>(null);
  const [parsedInfo, setParsedInfo] = useState<ParsedFileInfo | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Initialize from props
  useEffect(() => {
    if (initialClassId) {
      const match = classes.find((c) => c.id === initialClassId);
      if (match && !classNameInput) {
        setClassNameInput(match.name);
      }
    } else if (classes.length > 0 && !classNameInput) {
      setClassNameInput(classes[0].name);
    }
  }, [classes, initialClassId]);

  if (!isOpen) return null;

  const handleFileChange = (chosenFile: File | null) => {
    if (!chosenFile) return;
    setFile(chosenFile);
    setError('');

    // Parse filename for Class, Subject, Unit, Title
    const parsed = parseFileInfo(chosenFile.name);
    setParsedInfo(parsed);

    // Auto-populate typed inputs with intelligent parsed values
    if (parsed.className) {
      setClassNameInput(parsed.className);
    } else if (!classNameInput && classes.length > 0) {
      setClassNameInput(classes[0].name);
    }

    if (parsed.subjectName) {
      setSubjectNameInput(parsed.subjectName);
    } else if (!subjectNameInput) {
      setSubjectNameInput(
        (parsed.className || classNameInput).toLowerCase().includes('cs')
          ? 'Computer Science'
          : 'Artificial Intelligence'
      );
    }

    if (parsed.unitName) {
      setUnitNameInput(parsed.unitName);
    } else if (!unitNameInput) {
      setUnitNameInput(`Unit 1: Introduction to ${subjectNameInput || 'AI'}`);
    }

    if (parsed.title) {
      setTitle(parsed.title);
    } else if (!title) {
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
      setError('Please choose or drop an attachment to publish.');
      sounds.pop();
      return;
    }

    const finalClassName = (classNameInput.trim() || parsedInfo?.className || 'X A AI').trim();
    const finalSubjectName = (
      subjectNameInput.trim() ||
      parsedInfo?.subjectName ||
      (finalClassName.toLowerCase().includes('cs') ? 'Computer Science' : 'Artificial Intelligence')
    ).trim();
    const finalUnitName = (
      unitNameInput.trim() ||
      parsedInfo?.unitName ||
      `Unit 1: Introduction to ${finalSubjectName}`
    ).trim();
    const finalTitle = (
      title.trim() ||
      parsedInfo?.title ||
      file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    ).trim();

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('class_name', finalClassName);
      formData.append('subject_name', finalSubjectName);
      formData.append('unit_name', finalUnitName);
      formData.append('title', finalTitle);
      formData.append('description', description.trim());

      // Forward authorization token if available
      const token = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Upload failed with HTTP ${res.status}`);
      }

      sounds.fanfare();
      fireConfetti();
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      console.error('Publish to class library error:', err);
      sounds.pop();
      setError(err.message || 'Failed to publish to Class Library. Please check your connection and try again.');
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
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              🚀
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">Publish to Class Library</h2>
              <p className="text-xs text-sky-100 font-medium">
                Type Class, Subject &amp; Unit to publish — auto-creates any missing section on the fly!
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

          {/* 1. File Attachment Dropzone */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>📎</span> 1. File Attachment <span className="text-rose-500">*</span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed rounded-3xl p-5 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-sky-500 bg-sky-50 scale-[1.01]'
                  : file
                  ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
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
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-2 shadow-inner">
                    {typeInfo ? typeInfo.emoji : '📄'}
                  </div>
                  <div className="text-sm font-extrabold text-slate-800 break-all max-w-sm">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    {formatFileSize(file.size)}
                  </div>

                  {typeInfo && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border bg-white shadow-xs">
                      <span>Detected:</span>
                      <span className={`px-2 py-0.5 rounded-full ${typeInfo.badgeBg} ${typeInfo.badgeColor}`}>
                        {typeInfo.emoji} {typeInfo.label}
                      </span>
                    </div>
                  )}

                  <span className="text-[11px] text-sky-600 font-bold mt-2 hover:underline">
                    Click to change attachment
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl mb-2 shadow-inner">
                    📁
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-700 mb-0.5">
                    Drag &amp; drop file here, or <span className="text-sky-600 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium max-w-md">
                    Supports PDFs, HTML5 interactive apps/zips, videos, audio, images, PPTX, and DOCX
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Hierarchical Categorization (Type freely or click preset) */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                2. Categorize &amp; Auto-Organize Hierarchy
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ⚡ Auto-creates if not found
              </span>
            </div>

            {/* Class & Section Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-sky-600" />
                  <span>Class &amp; Section</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Type freely or choose preset</span>
              </div>

              <input
                list="class-suggestions"
                type="text"
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
                placeholder="e.g. X A AI, XI CS, XII AI, Grade 5..."
                className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-sky-500 focus:outline-none"
              />
              <datalist id="class-suggestions">
                {classes.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
                {STANDARD_CLASS_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {/* Quick Class Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                {STANDARD_CLASS_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setClassNameInput(p);
                      if (!subjectNameInput) {
                        setSubjectNameInput(p.includes('CS') ? 'Computer Science' : 'Artificial Intelligence');
                      }
                    }}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border transition-all ${
                      classNameInput.toLowerCase() === p.toLowerCase()
                        ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                        : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>Subject</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Type freely or choose preset</span>
              </div>

              <input
                list="subject-suggestions"
                type="text"
                value={subjectNameInput}
                onChange={(e) => setSubjectNameInput(e.target.value)}
                placeholder="e.g. Artificial Intelligence, Computer Science, Science..."
                className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-purple-500 focus:outline-none"
              />
              <datalist id="subject-suggestions">
                {STANDARD_SUBJECT_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              {/* Quick Subject Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                {STANDARD_SUBJECT_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setSubjectNameInput(s);
                    }}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border transition-all ${
                      subjectNameInput.toLowerCase() === s.toLowerCase()
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit / Topic Name Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unit / Topic Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Type freely to group files</span>
              </div>

              <input
                list="unit-suggestions"
                type="text"
                value={unitNameInput}
                onChange={(e) => setUnitNameInput(e.target.value)}
                placeholder="e.g. Unit 1 Introduction to AI, Unit 2 Python Basics..."
                className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              />
              <datalist id="unit-suggestions">
                {STANDARD_UNIT_PRESETS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>

              {/* Quick Unit Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                {STANDARD_UNIT_PRESETS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setUnitNameInput(u);
                    }}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border transition-all ${
                      unitNameInput.toLowerCase() === u.toLowerCase()
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resource Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Neural Networks Overview"
                className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teacher Note / Short Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Read through slides 1-10 before beginning the worksheet."
                className="w-full text-xs font-medium bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !file}
              className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-sm shadow-pop-blue flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing &amp; Auto-Organizing to Class Library...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-white" />
                  <span>Publish to Class Library 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
