'use client';

import React from 'react';
import { Download, Play, Eye, Sparkles, ExternalLink } from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { FILE_TYPE_MAP, formatFileSize } from '@/lib/file-types';
import { sounds } from '../sound-effects';

interface ResourceCardProps {
  resource: ResourceItem;
  onOpen: (resource: ResourceItem) => void;
  onDownload: (resource: ResourceItem) => void;
}

export default function ResourceCard({ resource, onOpen, onDownload }: ResourceCardProps) {
  const typeInfo = FILE_TYPE_MAP[resource.file_type] || FILE_TYPE_MAP.other;

  const getActionDetails = () => {
    switch (resource.file_type) {
      case 'html':
        return { label: 'Play Game / Sim', icon: '🎮', btnColor: 'bg-violet-500 hover:bg-violet-600 shadow-pop-purple' };
      case 'pdf':
        return { label: 'Read PDF', icon: '📄', btnColor: 'bg-rose-500 hover:bg-rose-600 shadow-pop-pink' };
      case 'video':
        return { label: 'Watch Video', icon: '🎬', btnColor: 'bg-emerald-500 hover:bg-emerald-600 shadow-pop-green' };
      case 'audio':
        return { label: 'Listen to Story', icon: '🎵', btnColor: 'bg-sky-500 hover:bg-sky-600 shadow-pop-blue' };
      case 'image':
        return { label: 'View Picture', icon: '🖼️', btnColor: 'bg-amber-500 hover:bg-amber-600 shadow-pop-yellow' };
      case 'document':
      default:
        return { label: 'Open Worksheet', icon: '📝', btnColor: 'bg-indigo-500 hover:bg-indigo-600 shadow-pop-purple' };
    }
  };

  const action = getActionDetails();

  return (
    <div className="group bg-white rounded-3xl p-5 border-2 border-slate-100 hover:border-sky-300 shadow-sm hover:shadow-bouncy transition-all flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${typeInfo.badgeBg} ${typeInfo.badgeColor}`}
          >
            <span>{typeInfo.emoji}</span>
            <span>{typeInfo.label}</span>
          </span>

          <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-150">
            {formatFileSize(resource.file_size)}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-bold text-slate-800 font-display line-clamp-2 group-hover:text-sky-600 transition-colors mb-1.5">
          {resource.title}
        </h4>

        {/* Description / Teacher Note */}
        {resource.description ? (
          <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">
            {resource.description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-4">No special notes from teacher.</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
        <button
          onClick={() => {
            sounds.pop();
            onOpen(resource);
          }}
          className={`btn-bouncy flex-1 py-2.5 px-3 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 ${action.btnColor}`}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>

        <button
          onClick={() => {
            sounds.star();
            onDownload(resource);
          }}
          title="Download File"
          className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
