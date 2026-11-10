'use client';

import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, Maximize2, FileText, Sparkles, ExternalLink } from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { sounds } from '../sound-effects';

interface PdfViewerModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function PdfViewerModal({ resource, onClose, onDownload }: PdfViewerModalProps) {
  const [zoom, setZoom] = useState<number>(100);

  if (!resource) return null;

  const basePdfUrl = resource.file_url || `/api/resources/${resource.id}/file`;
  const pdfUrl = basePdfUrl.includes('?') ? `${basePdfUrl}&t=${Date.now()}` : `${basePdfUrl}?t=${Date.now()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-pop">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-rose-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📄
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">{resource.title}</h2>
              <p className="text-xs text-rose-100 flex items-center gap-1 font-medium">
                <span>{resource.unit_name || 'Class Unit'}</span> • <span>{resource.file_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.pop();
                setZoom((prev) => Math.max(70, prev - 15));
              }}
              title="Zoom Out"
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-white px-1">{zoom}%</span>
            <button
              onClick={() => {
                sounds.pop();
                setZoom((prev) => Math.min(150, prev + 15));
              }}
              title="Zoom In"
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                sounds.fanfare();
                window.open(resource.file_url || `/api/resources/${resource.id}/file`, '_blank');
              }}
              title="Open in Full New Tab"
              className="btn-bouncy flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs ml-2 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab ↗</span>
            </button>

            <button
              onClick={() => {
                sounds.star();
                onDownload();
              }}
              className="btn-bouncy flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs ml-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={() => {
                sounds.pop();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white ml-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Reader Container */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-auto flex items-center justify-center">
          <div
            className="w-full h-full bg-white rounded-2xl shadow-inner overflow-hidden border border-slate-200 transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={resource.title}
            />
          </div>
        </div>

        {/* Kid-friendly helper footer */}
        <div className="bg-rose-50 px-6 py-2.5 border-t border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-amber-500" /> Kid-Safe Document Viewer
          </span>
          <span className="font-semibold text-slate-500">
            Scroll inside to read pages or click Download to print!
          </span>
        </div>
      </div>
    </div>
  );
}
