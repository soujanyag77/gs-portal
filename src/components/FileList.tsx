'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Download,
  Trash2,
  Search,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
  Check,
  Calendar,
  HardDrive,
  Eye,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { UploadedFile } from '@/lib/types';
import {
  downloadFile,
  getFileCategoryMeta,
  formatBytes,
  formatUploadDate,
  FileCategory,
} from '@/lib/download-utils';
import { sounds } from './sound-effects';

interface FileListProps {
  files: UploadedFile[];
  loading?: boolean;
  onFileDeleted?: (id: string) => void;
  onRefresh?: () => void;
}

export default function FileList({
  files,
  loading = false,
  onFileDeleted,
  onRefresh,
}: FileListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Deleting and downloading state tracking
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  // Filter files
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.mime_type.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    const meta = getFileCategoryMeta(f.file_name, f.mime_type);
    return meta.category === selectedCategory;
  });

  const handleDelete = async (file: UploadedFile) => {
    if (!confirm(`Are you sure you want to delete "${file.file_name}" from storage and database?`)) {
      return;
    }

    sounds.pop();
    setDeletingId(file.id);

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        sounds.star();
        if (onFileDeleted) onFileDeleted(file.id);
      } else {
        const err = await res.json();
        alert(`Failed to delete file: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting file.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    sounds.star();
    setDownloadingId(file.id);

    try {
      const downloadUrl = `/api/files/download/${file.id}`;
      const success = await downloadFile(downloadUrl, file.file_name);
      if (success) {
        setDownloadSuccessId(file.id);
        setTimeout(() => setDownloadSuccessId(null), 2500);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenInNewTab = (file: UploadedFile) => {
    sounds.fanfare();
    const viewUrl = `/api/files/view/${file.id}`;
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

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

  return (
    <div className="w-full bg-white rounded-4xl border-3 border-sky-100 p-6 sm:p-8 shadow-bouncy space-y-6">
      {/* Explorer Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🗂️</span>
            <h3 className="text-xl sm:text-2xl font-black font-display text-slate-800">
              Uploaded Files Explorer
            </h3>
            <span className="bg-sky-100 text-sky-800 text-xs px-3 py-1 rounded-full font-black">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            View in new browser tab with proper MIME rendering, or download with original filename and extension.
          </p>
        </div>

        {/* View Mode & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <button
              onClick={() => {
                sounds.pop();
                onRefresh();
              }}
              title="Refresh files list"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                sounds.pop();
                setViewMode('table');
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => {
                sounds.pop();
                setViewMode('cards');
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name or MIME type..."
            className="w-full text-xs sm:text-sm font-bold pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', label: 'All' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'html', label: 'HTML' },
            { id: 'image', label: 'Images' },
            { id: 'word', label: 'Word' },
            { id: 'sheet', label: 'Sheets' },
            { id: 'code', label: 'Code' },
            { id: 'video', label: 'Video' },
            { id: 'audio', label: 'Audio' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sounds.pop();
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-sky-500 text-white shadow-pop-blue'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering: Skeletons, Empty State, Table, or Cards */}
      {loading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
              <div className="h-6 bg-slate-200 rounded-full w-24 hidden sm:block" />
              <div className="h-6 bg-slate-200 rounded-full w-28 hidden md:block" />
              <div className="h-9 bg-slate-200 rounded-xl w-36" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center text-3xl">
            📦
          </div>
          <h4 className="text-base sm:text-lg font-black text-slate-800 font-display">
            {files.length === 0 ? 'No files uploaded yet!' : 'No files match your search'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {files.length === 0
              ? 'Upload your first file using the upload zone above. All file extensions are supported.'
              : 'Try clearing the search query or selecting "All" to browse all files.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 pl-4">File Name</th>
                <th className="py-3.5">Size</th>
                <th className="py-3.5">Upload Date</th>
                <th className="py-3.5">MIME Type</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredFiles.map((file) => {
                const meta = getFileCategoryMeta(file.file_name, file.mime_type);
                const isCurDownloading = downloadingId === file.id;
                const isCurSuccess = downloadSuccessId === file.id;
                const isCurDeleting = deletingId === file.id;

                return (
                  <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* File Name & Icon */}
                    <td className="py-3.5 pl-4 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner border flex-shrink-0 ${meta.iconBg} ${meta.badgeBorder} ${meta.iconColor}`}
                        >
                          {renderCategoryIcon(meta.category, 'w-5 h-5')}
                        </div>

                        <div className="min-w-0">
                          <div
                            onClick={() => handleOpenInNewTab(file)}
                            className="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1.5 truncate"
                            title="Click to view file in new tab"
                          >
                            <span className="truncate">{file.file_name}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase border ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
                            >
                              {meta.ext.replace('.', '') || meta.category}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate font-mono">
                              {file.file_path}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <HardDrive className="w-3 h-3 text-slate-400" />
                        <span>{formatBytes(file.file_size)}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatUploadDate(file.created_at)}</span>
                      </div>
                    </td>

                    {/* MIME Type */}
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200">
                        {file.mime_type}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 text-right pr-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open / View Button */}
                        <a
                          href={`/api/files/view/${file.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => sounds.fanfare()}
                          className="btn-bouncy px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-extrabold text-xs flex items-center gap-1.5 border border-sky-200 transition-colors shadow-xs"
                          title="Open file in new tab with proper MIME rendering"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Open / View</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>

                        {/* Download Button */}
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={isCurDownloading}
                          className={`btn-bouncy px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border shadow-xs transition-all ${
                            isCurSuccess
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Download preserving original filename and extension"
                        >
                          {isCurDownloading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : isCurSuccess ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {isCurDownloading ? 'Downloading...' : isCurSuccess ? 'Saved!' : 'Download'}
                          </span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(file)}
                          disabled={isCurDeleting}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          title="Delete from storage and database"
                        >
                          {isCurDeleting ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const meta = getFileCategoryMeta(file.file_name, file.mime_type);
            const isCurDownloading = downloadingId === file.id;
            const isCurSuccess = downloadSuccessId === file.id;
            const isCurDeleting = deletingId === file.id;

            return (
              <div
                key={file.id}
                className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col overflow-hidden group"
              >
                {/* Banner */}
                <div
                  onClick={() => handleOpenInNewTab(file)}
                  className={`h-28 p-4 cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all ${meta.iconBg}`}
                >
                  <div className="flex items-center justify-between z-10">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full shadow-xs">
                      {formatBytes(file.file_size)}
                    </span>
                  </div>

                  <div className="flex items-center justify-center text-4xl transform group-hover:scale-110 transition-transform">
                    {meta.emoji}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4
                      onClick={() => handleOpenInNewTab(file)}
                      className="font-black text-slate-800 text-sm font-display line-clamp-2 hover:text-sky-600 transition-colors cursor-pointer mb-1"
                      title={file.file_name}
                    >
                      {file.file_name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatUploadDate(file.created_at)}</span>
                    </div>

                    <div className="mt-2">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 block truncate" title={file.mime_type}>
                        {file.mime_type}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <a
                      href={`/api/files/view/${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sounds.fanfare()}
                      className="btn-bouncy flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-pop-blue"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>

                    <button
                      onClick={() => handleDownload(file)}
                      disabled={isCurDownloading}
                      title="Download file"
                      className={`btn-bouncy p-2 rounded-xl border transition-all ${
                        isCurSuccess
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isCurDownloading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : isCurSuccess ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(file)}
                      disabled={isCurDeleting}
                      title="Delete file"
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors"
                    >
                      {isCurDeleting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
