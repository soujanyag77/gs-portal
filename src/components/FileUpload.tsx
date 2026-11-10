'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  Upload,
  CloudUpload,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { UploadedFile } from '@/lib/types';
import { formatBytes, getFileCategoryMeta } from '@/lib/download-utils';
import { sounds } from './sound-effects';
import { fireConfetti } from './ConfettiCelebration';

interface FileUploadProps {
  onUploadSuccess?: (file: UploadedFile) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    sounds.pop();
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgress(0);
  };

  const handleClearSelection = () => {
    sounds.pop();
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setProgress(0);
    setErrorMessage(null);
    setSuccessMessage(null);
    sounds.pop();

    const formData = new FormData();
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.file) {
            sounds.fanfare();
            fireConfetti();
            setSuccessMessage(`Successfully uploaded "${selectedFile.name}" to portal-files!`);
            setSelectedFile(null);
            setProgress(100);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onUploadSuccess) onUploadSuccess(res.file);
          } else {
            setErrorMessage(res.error || 'Server rejected file upload');
          }
        } catch {
          setErrorMessage('Failed to parse upload server response');
        }
      } else {
        setErrorMessage(`Upload failed with status HTTP ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setErrorMessage('Network error during file upload. Check your connection.');
    };

    xhr.send(formData);
  };

  const meta = selectedFile ? getFileCategoryMeta(selectedFile.name, selectedFile.type) : null;

  return (
    <div className="w-full bg-white rounded-4xl border-3 border-sky-100 p-6 sm:p-8 shadow-bouncy space-y-6">
      {/* Title & Storage Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl sm:text-2xl font-black font-display text-slate-800">
              Upload Files to Storage
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Drag and drop any file type. Saved directly to Supabase Storage (<code className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-mono text-xs">portal-files</code>).
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Any Format Supported (*/*)</span>
        </div>
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!selectedFile && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={`relative border-3 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-sky-500 bg-sky-50/80 scale-[1.01] shadow-lg'
            : selectedFile
            ? 'border-emerald-300 bg-emerald-50/30'
            : 'border-slate-200 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner transition-transform ${
                isDragging ? 'bg-sky-500 text-white scale-110 rotate-6' : 'bg-sky-100 text-sky-600'
              }`}
            >
              <CloudUpload className="w-10 h-10" />
            </div>

            <div>
              <p className="text-base sm:text-lg font-black text-slate-800 font-display">
                Drop your file here, or{' '}
                <span className="text-sky-600 underline underline-offset-4 hover:text-sky-700">
                  browse files
                </span>
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Supports PDF, HTML, Word (.docx), Excel (.xlsx), Images, Videos, Audio, Code &amp; Archives
              </p>
            </div>
          </div>
        ) : (
          /* File Preview Card before upload */
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 text-left min-w-0 w-full sm:w-auto">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border flex-shrink-0 ${meta?.iconBg} ${meta?.badgeBorder} ${meta?.iconColor}`}
              >
                {meta?.emoji || '📁'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-slate-800 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${meta?.badgeBg} ${meta?.badgeColor} ${meta?.badgeBorder}`}
                  >
                    {meta?.label || 'File'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    {formatBytes(selectedFile.size)}
                  </span>
                  <span>•</span>
                  <span className="text-slate-400">{selectedFile.type || 'application/octet-stream'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!isUploading && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors"
                  title="Remove selection"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={uploadFile}
                disabled={isUploading}
                className="btn-bouncy flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-pop-blue flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? `Uploading ${progress}%` : 'Upload Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Upload Progress Bar */}
      {isUploading && (
        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-pop">
          <div className="flex items-center justify-between text-xs font-black text-slate-700">
            <span className="flex items-center gap-1.5 text-sky-700">
              <Sparkles className="w-4 h-4 animate-spin text-sky-500" />
              <span>Streaming to Supabase Storage (portal-files)...</span>
            </span>
            <span>{progress}%</span>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold animate-pop">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-900 text-xs font-bold animate-pop">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 rounded-lg text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
