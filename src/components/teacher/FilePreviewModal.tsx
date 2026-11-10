'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
  AlertCircle,
  Sparkles,
  Table as TableIcon,
  Code as CodeIcon,
  Play,
  Pause,
} from 'lucide-react';
import { ResourceItem } from '@/lib/types';
import {
  downloadFile,
  getFileCategoryMeta,
  formatBytes,
  formatUploadDate,
  FileCategory,
} from '@/lib/download-utils';
import { sounds } from '../sound-effects';

interface FilePreviewModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  onResourceUpdated?: () => void;
}

export default function FilePreviewModal({
  resource,
  onClose,
  onResourceUpdated,
}: FilePreviewModalProps) {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Text/Code/CSV Content state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState<boolean>(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [wrapLines, setWrapLines] = useState<boolean>(true);
  const [csvViewMode, setCsvViewMode] = useState<'table' | 'raw'>('table');

  // Download state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // General load/error state
  const [contentLoading, setContentLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Playback rate for media
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  // Category and URLs
  const meta = resource ? getFileCategoryMeta(resource.file_name, resource.mime_type) : null;
  const rawFileUrl = resource?.file_url || (resource ? `/api/resources/${resource.id}/file` : '');

  // Ensure fresh URL with timestamp if retrying
  const fileUrl = rawFileUrl.includes('?')
    ? `${rawFileUrl}&t=${reloadKey}`
    : `${rawFileUrl}?t=${reloadKey}`;

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Reset states on resource change
  useEffect(() => {
    setZoom(100);
    setRotation(0);
    setIsFitWidth(true);
    setTextContent(null);
    setTextLoading(false);
    setTextError(null);
    setContentLoading(true);
    setLoadError(null);
    setDownloadSuccess(false);
    setCsvViewMode('table');
  }, [resource, reloadKey]);

  // Fetch text/code content if category is code, text, or csv
  useEffect(() => {
    if (!resource) return;
    const isCodeOrText = ['code', 'text'].includes(meta?.category || '') || resource.file_name.endsWith('.csv');
    if (isCodeOrText) {
      setTextLoading(true);
      setTextError(null);
      fetch(fileUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.text();
        })
        .then((txt) => {
          setTextContent(txt);
          setTextLoading(false);
          setContentLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch text content:', err);
          setTextError(err.message || 'Failed to load text content');
          setTextLoading(false);
          setContentLoading(false);
        });
    }
  }, [resource, meta?.category, fileUrl]);

  if (!resource || !meta) return null;

  // Handle Download
  const handleDownload = async () => {
    sounds.star();
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const success = await downloadFile(rawFileUrl, resource.file_name);
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2500);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Copy Text/Code
  const handleCopy = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    sounds.pop();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Reload / Retry
  const handleRetry = () => {
    sounds.pop();
    setReloadKey((prev) => prev + 1);
  };

  // Category Icon helper
  const renderCategoryIcon = (category: FileCategory, className: string = 'w-5 h-5') => {
    switch (category) {
      case 'pdf':
        return <FileText className={className} />;
      case 'word':
      case 'presentation':
        return <FileText className={className} />;
      case 'sheet':
        return <FileSpreadsheet className={className} />;
      case 'code':
        return <FileCode className={className} />;
      case 'image':
        return <FileImage className={className} />;
      case 'audio':
        return <FileAudio className={className} />;
      case 'video':
        return <FileVideo className={className} />;
      case 'archive':
        return <FileArchive className={className} />;
      default:
        return <File className={className} />;
    }
  };

  // Open Raw in New Tab
  const handleOpenRawNewTab = () => {
    sounds.fanfare();
    if (meta.category === 'html') {
      const openUrl = resource.interactive_entry_url || rawFileUrl;
      window.open(openUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open(rawFileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-pop">
      <div
        className={`bg-white w-full rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-slate-200 transition-all duration-300 ${
          isFullScreen ? 'fixed inset-0 rounded-none border-0 h-full w-full' : 'max-w-6xl h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          {/* File Title & Metadata Badges */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner border flex-shrink-0 ${meta.iconBg} ${meta.badgeBorder} ${meta.iconColor}`}
            >
              {renderCategoryIcon(meta.category, 'w-5 h-5')}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-base sm:text-lg font-black text-slate-800 font-display truncate max-w-sm sm:max-w-md"
                  title={resource.title}
                >
                  {resource.title}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
                >
                  {meta.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate mt-0.5">
                <span className="truncate text-slate-600 font-semibold">{resource.file_name}</span>
                <span>•</span>
                <span>{formatBytes(resource.file_size)}</span>
                {resource.class_name && (
                  <>
                    <span>•</span>
                    <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 text-[11px]">
                      🎒 {resource.class_name}
                    </span>
                  </>
                )}
                {resource.unit_name && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                      📖 {resource.unit_name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Image zoom / rotate controls */}
            {meta.category === 'image' && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl mr-1">
                <button
                  onClick={() => setZoom((z) => Math.max(40, z - 20))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 px-1">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(250, z + 20))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors ml-1"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Code / Text copy and wrap controls */}
            {['code', 'text'].includes(meta.category) && textContent && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={() => setWrapLines(!wrapLines)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    wrapLines ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="Toggle Word Wrap"
                >
                  Wrap
                </button>
                <button
                  onClick={handleCopy}
                  className="btn-bouncy px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            )}

            {/* CSV Table vs Raw toggle */}
            {resource.file_name.endsWith('.csv') && textContent && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-1">
                <button
                  onClick={() => setCsvViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    csvViewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setCsvViewMode('raw')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    csvViewMode === 'raw' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CodeIcon className="w-3.5 h-3.5" />
                  <span>Raw</span>
                </button>
              </div>
            )}

            {/* Retry button if error */}
            {loadError && (
              <button
                onClick={handleRetry}
                className="btn-bouncy px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs flex items-center gap-1.5 border border-amber-300"
                title="Retry loading file"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}

            {/* Open Raw in New Tab */}
            <button
              onClick={handleOpenRawNewTab}
              title="Open raw file in new browser tab"
              className="btn-bouncy px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-xs flex items-center gap-1.5 border border-sky-200 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab ↗</span>
            </button>

            {/* Direct Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download file directly to computer"
              className={`btn-bouncy px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 border shadow-xs transition-all ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-pop-green'
              } disabled:opacity-60`}
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloading ? 'Downloading...' : downloadSuccess ? 'Downloaded!' : 'Download'}</span>
            </button>

            {/* Full Screen Toggle */}
            <button
              onClick={() => {
                sounds.pop();
                setIsFullScreen(!isFullScreen);
              }}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                sounds.pop();
                onClose();
              }}
              title="Close Preview (Esc)"
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 bg-slate-900/5 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
          {/* Skeleton / Spinner overlay when loading */}
          {contentLoading && !textLoading && meta.category !== 'image' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center animate-bounce shadow-md">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700 font-display">
                Loading {meta.label}...
              </p>
              <p className="text-xs text-slate-400 font-medium">Preparing document reader &amp; view</p>
            </div>
          )}

          {/* Expired / Error Banner */}
          {loadError && (
            <div className="m-6 p-6 bg-rose-50 border-2 border-rose-200 rounded-3xl max-w-lg text-center space-y-3 shadow-lg z-30">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="text-base font-extrabold text-rose-900">Unable to Display Preview Directly</h4>
              <p className="text-xs text-rose-700 font-medium">
                {loadError}. The signed storage link may have expired or requires cross-origin access.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRetry}
                  className="btn-bouncy px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Reload</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="btn-bouncy px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={handleOpenRawNewTab}
                  className="btn-bouncy px-4 py-2 bg-white text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>
              </div>
            </div>
          )}

          {/* FORMAT 1: PDF Viewer */}
          {meta.category === 'pdf' && (
            <div className="w-full h-full p-2 sm:p-4 flex flex-col items-center justify-center bg-slate-100">
              <div
                className="w-full h-full bg-white rounded-2xl shadow-inner overflow-hidden border border-slate-200"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <object
                  data={fileUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-2xl border-0"
                  onLoad={() => setContentLoading(false)}
                  onError={() => {
                    setContentLoading(false);
                    setLoadError('PDF viewer could not embed directly');
                  }}
                >
                  <iframe
                    src={fileUrl}
                    className="w-full h-full rounded-2xl border-0"
                    title={resource.title}
                    onLoad={() => setContentLoading(false)}
                  />
                </object>
              </div>
            </div>
          )}

          {/* FORMAT 2: Image Lightbox */}
          {meta.category === 'image' && (
            <div className="w-full h-full bg-slate-950/95 p-4 overflow-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={resource.title}
                onLoad={() => setContentLoading(false)}
                onError={() => {
                  setContentLoading(false);
                  setLoadError('Image failed to load or link has expired');
                }}
                className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl transition-all duration-200 select-none"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}

          {/* FORMAT 3: Word Document (.docx, .doc) */}
          {meta.category === 'word' && (
            <div className="w-full h-full p-2 sm:p-4 flex flex-col bg-slate-100">
              {/* If local/relative, our route /api/resources/[id]/file renders the parsed docx reader directly in HTML! */}
              <iframe
                src={fileUrl}
                className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-md"
                title={resource.title}
                onLoad={() => setContentLoading(false)}
                onError={() => {
                  setContentLoading(false);
                  setLoadError('Word document reader could not load');
                }}
              />
            </div>
          )}

          {/* FORMAT 4: Spreadsheets (.xlsx, .xls) and Presentations (.pptx, .ppt) */}
          {['sheet', 'presentation'].includes(meta.category) && !resource.file_name.endsWith('.csv') && (
            <div className="w-full h-full p-3 sm:p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 overflow-auto">
              {/* Embedded Google Docs Viewer */}
              {rawFileUrl.startsWith('http') ? (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(rawFileUrl)}&embedded=true`}
                  className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-lg"
                  title={resource.title}
                  onLoad={() => setContentLoading(false)}
                />
              ) : (
                <div className="bg-white max-w-md w-full p-8 rounded-3xl border-2 border-slate-200 shadow-xl text-center space-y-5 animate-pop">
                  <div
                    className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-inner ${meta.iconBg} ${meta.iconColor}`}
                  >
                    {renderCategoryIcon(meta.category, 'w-10 h-10')}
                  </div>
                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${meta.badgeBg} ${meta.badgeColor} border ${meta.badgeBorder}`}
                    >
                      {meta.label}
                    </span>
                    <h4 className="text-xl font-black text-slate-800 font-display mb-1">{resource.file_name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      File Size: <strong className="text-slate-700">{formatBytes(resource.file_size)}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    💡 This {meta.label} can be opened with Microsoft Office, Google Sheets/Slides, or LibreOffice.
                    Download the file below to view full formulas, slides, or tables.
                  </p>

                  <div className="space-y-2.5">
                    <button
                      onClick={handleDownload}
                      className="btn-bouncy w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-pop-green flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {meta.label}</span>
                    </button>
                    <button
                      onClick={handleOpenRawNewTab}
                      className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Browser Tab ↗</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FORMAT 5: Code & Text Monospace View (JS, TS, PY, HTML, CSS, JSON, TXT, CSV) */}
          {(['code', 'text'].includes(meta.category) || resource.file_name.endsWith('.csv')) && (
            <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 p-3 sm:p-5 overflow-hidden">
              {textLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-300">Reading text buffer...</p>
                </div>
              ) : textError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">Failed to read text stream</h4>
                  <p className="text-xs text-rose-300 max-w-sm mb-4">{textError}</p>
                  <button
                    onClick={handleDownload}
                    className="btn-bouncy px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    Download File Directly
                  </button>
                </div>
              ) : resource.file_name.endsWith('.csv') && csvViewMode === 'table' && textContent ? (
                /* CSV Clean HTML Table View */
                <div className="flex-1 overflow-auto rounded-2xl bg-slate-950 border border-slate-800 p-2">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <tbody>
                      {textContent
                        .split('\n')
                        .filter((line) => line.trim().length > 0)
                        .map((row, rowIdx) => {
                          const cells = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
                          const isHeader = rowIdx === 0;
                          return (
                            <tr
                              key={rowIdx}
                              className={isHeader ? 'bg-slate-900 font-black text-sky-400' : 'hover:bg-slate-900/60'}
                            >
                              <td className="py-2 px-3 text-[10px] text-slate-500 font-mono select-none w-10">
                                {rowIdx + 1}
                              </td>
                              {cells.map((cell, cIdx) => (
                                <td key={cIdx} className="py-2 px-3 text-slate-200 border-l border-slate-800/80">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Code / Monospace Syntax View */
                <div className="flex-1 overflow-auto rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs leading-relaxed">
                  <pre className={`m-0 ${wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                    <code>
                      {textContent?.split('\n').map((line, idx) => (
                        <div key={idx} className="table-row">
                          <span className="table-cell pr-4 text-slate-600 select-none text-[11px] text-right w-12 font-mono">
                            {idx + 1}
                          </span>
                          <span className="table-cell text-emerald-300 font-mono">{line || ' '}</span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* FORMAT 6: Audio & Video Player */}
          {meta.category === 'video' && (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4">
              <video
                ref={mediaRef as any}
                controls
                src={fileUrl}
                onLoadedData={() => setContentLoading(false)}
                onError={() => {
                  setContentLoading(false);
                  setLoadError('Video failed to play or codec unsupported in browser');
                }}
                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl bg-black"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {meta.category === 'audio' && (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 flex flex-col items-center justify-center p-6 text-white text-center">
              <div className="w-28 h-28 rounded-full bg-sky-500/20 border-4 border-sky-400 flex items-center justify-center text-5xl mb-6 shadow-2xl animate-pulse">
                🎵
              </div>
              <h4 className="text-2xl font-black font-display mb-1">{resource.title}</h4>
              <p className="text-xs text-sky-200 mb-6 font-medium">{resource.file_name}</p>

              <div className="w-full max-w-md bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl">
                <audio
                  ref={mediaRef as any}
                  controls
                  src={fileUrl}
                  onLoadedData={() => setContentLoading(false)}
                  onError={() => {
                    setContentLoading(false);
                    setLoadError('Audio failed to stream');
                  }}
                  className="w-full"
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            </div>
          )}

          {/* FORMAT 7: HTML5 Interactive Games / Sims */}
          {meta.category === 'html' && (
            <div className="w-full h-full p-2 sm:p-3 flex flex-col bg-slate-950">
              <iframe
                src={resource.interactive_entry_url || fileUrl}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full h-full bg-white rounded-2xl border-0 shadow-lg"
                title={resource.title}
                onLoad={() => setContentLoading(false)}
                onError={() => {
                  setContentLoading(false);
                  setLoadError('Interactive HTML app failed to launch');
                }}
              />
            </div>
          )}

          {/* FORMAT 8: Other / Fallback */}
          {meta.category === 'other' || meta.category === 'archive' ? (
            <div className="w-full h-full p-6 flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white max-w-md w-full p-8 rounded-3xl border-2 border-slate-200 shadow-xl text-center space-y-4 animate-pop">
                <div
                  className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-inner ${meta.iconBg} ${meta.iconColor}`}
                >
                  {renderCategoryIcon(meta.category, 'w-10 h-10')}
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${meta.badgeBg} ${meta.badgeColor} border ${meta.badgeBorder}`}
                  >
                    {meta.label}
                  </span>
                  <h4 className="text-lg font-bold text-slate-800 font-display mb-1">{resource.file_name}</h4>
                  <p className="text-xs text-slate-400 font-medium">Size: {formatBytes(resource.file_size)}</p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  This file type cannot be previewed in the browser directly. Click download to save it to your device!
                </p>

                <button
                  onClick={handleDownload}
                  className="btn-bouncy w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-pop-green flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File ({formatBytes(resource.file_size)})</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer with Engagement & Quick Details */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" /> Educator File Viewer
            </span>
            <span>•</span>
            <span>Uploaded: <strong className="text-slate-700">{formatUploadDate(resource.created_at)}</strong></span>
            <span>•</span>
            <span>Size: <strong className="text-slate-700">{formatBytes(resource.file_size)}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <span title="Total Student Views">👁️ {resource.view_count || 0} Views</span>
            <span title="Total Student Downloads">📥 {resource.download_count || 0} Downloads</span>
            <span className="text-slate-400 hidden sm:inline">Press [Esc] to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
