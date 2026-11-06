'use client';

import React from 'react';
import { X, Download, FileText, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { formatFileSize } from '@/lib/file-types';
import { sounds } from '../sound-effects';

interface DocumentCardModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function DocumentCardModal({ resource, onClose, onDownload }: DocumentCardModalProps) {
  if (!resource) return null;

  const ext = resource.file_name.slice(resource.file_name.lastIndexOf('.')).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-pop">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border-4 border-indigo-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📝
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">{resource.title}</h2>
              <span className="text-xs text-indigo-100 font-medium">{resource.unit_name || 'Class Unit'}</span>
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

        {/* Card Body */}
        <div className="p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex flex-col items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="w-8 h-8" />
            <span className="text-[10px] font-black uppercase mt-1">{ext || 'DOC'}</span>
          </div>

          <h3 className="text-xl font-bold text-slate-800 font-display mb-1">{resource.file_name}</h3>
          <p className="text-xs font-semibold text-slate-400 mb-4">
            Size: {formatFileSize(resource.file_size)}
          </p>

          {resource.description && (
            <div className="bg-indigo-50/60 rounded-2xl p-4 text-sm text-indigo-950 font-medium text-left border border-indigo-100 mb-6 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>{resource.description}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => {
                sounds.fanfare();
                onDownload();
              }}
              className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-base shadow-pop-purple flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Download & Open Worksheet</span>
            </button>

            <p className="text-xs text-slate-500 font-medium">
              💡 Open in Microsoft Word, PowerPoint, or Google Docs to view and complete!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
