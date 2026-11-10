'use client';

import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Sparkles, ExternalLink } from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import { sounds } from '../sound-effects';

interface ImageLightboxModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function ImageLightboxModal({ resource, onClose, onDownload }: ImageLightboxModalProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  if (!resource) return null;

  const baseImageUrl = resource.file_url || `/api/resources/${resource.id}/file`;
  const imageUrl = baseImageUrl.includes('?') ? `${baseImageUrl}&t=${resource.id}` : `${baseImageUrl}?t=${resource.id}`;

  const handleRotate = () => {
    sounds.pop();
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-pop">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-amber-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              🖼️
            </div>
            <div>
              <h2 className="text-xl font-bold font-display leading-tight">{resource.title}</h2>
              <p className="text-xs text-amber-100 font-medium">
                {resource.subject_name || 'Art & Diagrams'} • {resource.file_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.pop();
                setZoom((z) => Math.max(60, z - 20));
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-white px-1">{zoom}%</span>
            <button
              onClick={() => {
                sounds.pop();
                setZoom((z) => Math.min(200, z + 20));
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <button
              onClick={handleRotate}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                sounds.fanfare();
                window.open(resource.file_url || `/api/resources/${resource.id}/file`, '_blank');
              }}
              title="Open full image in new tab"
              className="btn-bouncy flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-sm ml-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>New Tab ↗</span>
            </button>

            <button
              onClick={() => {
                sounds.star();
                onDownload();
              }}
              className="btn-bouncy flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-amber-900 font-bold text-xs shadow-sm ml-2"
            >
              <Download className="w-4 h-4" />
              <span>Save</span>
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

        {/* Image Preview Canvas */}
        <div className="flex-1 bg-slate-950/90 p-4 overflow-auto flex items-center justify-center min-h-[350px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={resource.title}
            className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl transition-all duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          />
        </div>

        {/* Description caption */}
        {resource.description && (
          <div className="bg-amber-50 px-6 py-2.5 border-t border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="font-semibold">{resource.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}
