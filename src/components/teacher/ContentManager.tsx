'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Upload,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  School,
  BookOpen,
  Folder,
  Sparkles,
  Download,
  Check,
  ExternalLink,
  LayoutGrid,
  List,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
  Layers,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { ClassItem, SubjectItem, UnitItem, ResourceItem, FileType } from '@/lib/types';
import {
  downloadFile,
  getFileCategoryMeta,
  formatBytes,
  formatUploadDate,
  FileCategory,
} from '@/lib/download-utils';
import EmptyState from '../EmptyState';
import FileUploadModal from './FileUploadModal';
import ClassManagerModal from './ClassManagerModal';
import SubjectModal from './SubjectModal';
import UnitModal from './UnitModal';
import FilePreviewModal from './FilePreviewModal';
import { sounds } from '../sound-effects';

export default function ContentManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // View mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Cascading Filter Selection
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterUnitId, setFilterUnitId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);

  // Download feedback states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  // Edit Resource modal state
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  // Comprehensive File Preview modal state
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);

  // Load Classes
  async function loadClasses() {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data.classes || []);
      if (data.classes?.length > 0 && !filterClassId) {
        setFilterClassId(data.classes[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }

  // Load Subjects when class changes
  async function loadSubjects(classId?: string) {
    if (!classId) {
      setSubjects([]);
      return;
    }
    try {
      const res = await fetch(`/api/subjects?class_id=${classId}`);
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  }

  // Load Units when subject changes
  async function loadUnits(subjectId?: string) {
    if (!subjectId) {
      setUnits([]);
      return;
    }
    try {
      const res = await fetch(`/api/units?subject_id=${subjectId}`);
      const data = await res.json();
      setUnits(data.units || []);
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  }

  // Load Resources with current filters
  async function loadResources() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClassId) params.append('class_id', filterClassId);
      if (filterSubjectId) params.append('subject_id', filterSubjectId);
      if (filterUnitId) params.append('unit_id', filterUnitId);
      if (filterType !== 'all') params.append('file_type', filterType);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (filterClassId) {
      loadSubjects(filterClassId);
      setFilterSubjectId('');
      setFilterUnitId('');
    }
  }, [filterClassId]);

  useEffect(() => {
    if (filterSubjectId) {
      loadUnits(filterSubjectId);
      setFilterUnitId('');
    } else {
      setUnits([]);
    }
  }, [filterSubjectId]);

  useEffect(() => {
    loadResources();
  }, [filterClassId, filterSubjectId, filterUnitId, filterType, searchQuery]);

  const handleDeleteResource = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      sounds.pop();
      loadResources();
      loadClasses();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;
    try {
      await fetch(`/api/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
        }),
      });
      sounds.star();
      setEditingResource(null);
      loadResources();
    } catch (err) {
      console.error('Failed to edit resource:', err);
    }
  };

  const handleOpenInNewTab = (resource: ResourceItem) => {
    sounds.fanfare();
    const fileUrl = resource.file_url || `/api/resources/${resource.id}/file`;

    if (resource.file_type === 'html') {
      const interactiveUrl = resource.interactive_entry_url || fileUrl;
      window.open(interactiveUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = async (resource: ResourceItem) => {
    sounds.star();
    setDownloadingId(resource.id);
    try {
      const fileUrl = resource.file_url || `/api/resources/${resource.id}/file`;
      const success = await downloadFile(fileUrl, resource.file_name);
      if (success) {
        setDownloadSuccessId(resource.id);
        setTimeout(() => setDownloadSuccessId(null), 2500);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const renderCategoryIcon = (category: FileCategory, className: string = 'w-4 h-4') => {
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

  const classesUploadsSum = classes.reduce((sum, c) => sum + (c.resource_count || 0), 0);
  const totalUploadsCount = Math.max(classesUploadsSum, !filterClassId ? resources.length : 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Quick Actions & Curriculum Setup */}
      <div className="bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 rounded-3xl p-6 text-white shadow-bouncy flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🗂️</span>
            <h2 className="text-2xl font-bold font-display">Curriculum & Content Manager</h2>
          </div>
          <p className="text-xs text-sky-100 max-w-xl font-medium">
            Manage your Classrooms, Subjects, Units, and inspect, preview, and download all uploaded learning resources (PDFs, HTML5 simulations, worksheets, media, and code).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              sounds.pop();
              setIsUploadOpen(true);
            }}
            className="btn-bouncy px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-sm shadow-pop-yellow flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Resource</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setIsClassModalOpen(true);
            }}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5 backdrop-blur-sm"
          >
            <School className="w-4 h-4" />
            <span>Classes</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setIsSubjectModalOpen(true);
            }}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5 backdrop-blur-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Subjects</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setIsUnitModalOpen(true);
            }}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5 backdrop-blur-sm"
          >
            <Folder className="w-4 h-4" />
            <span>Units</span>
          </button>
        </div>
      </div>

      {/* Class Carousel Bar */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Classrooms
            </span>
            <span className="text-xs text-slate-400 font-bold">
              ({classes.length} classes available)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 bg-sky-50 text-sky-800 px-3 py-1 rounded-full border border-sky-200">
              📊 Class-Wise Uploaded Materials: <strong>{totalUploadsCount}</strong> Total Uploads
            </span>
            <button
              onClick={() => {
                sounds.pop();
                setIsClassModalOpen(true);
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => {
              sounds.pop();
              setFilterClassId('');
            }}
            className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-extrabold border-2 transition-all flex items-center gap-2 ${
              filterClassId === ''
                ? 'bg-sky-500 text-white border-sky-500 shadow-pop-blue'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>🌐</span>
            <span>All Classes</span>
            <span className="bg-white/30 px-2 py-0.5 rounded-full text-[10px]">
              {classesUploadsSum}
            </span>
          </button>

          {classes.map((cls) => {
            const isSelected = cls.id === filterClassId;
            return (
              <button
                key={cls.id}
                onClick={() => {
                  sounds.pop();
                  setFilterClassId(cls.id);
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-extrabold border-2 transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-500 shadow-pop-blue'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cls.icon || '🎒'}</span>
                <span>{cls.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cls.resource_count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cascading Filters, Search Bar & View Mode Toggle */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Filter By:
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Class &rarr; Subject &rarr; Unit &rarr; Format
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files or topics..."
                className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* View Mode Toggle (Table vs Cards) */}
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
                title="Table List View"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline">Table</span>
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
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Class / Grade</label>
            <select
              value={filterClassId}
              onChange={(e) => {
                setFilterClassId(e.target.value);
                sounds.pop();
              }}
              className="w-full text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '🎒'} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Subject</label>
            <select
              value={filterSubjectId}
              onChange={(e) => {
                setFilterSubjectId(e.target.value);
                sounds.pop();
              }}
              disabled={!filterClassId}
              className="w-full text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon || '📚'} {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Unit / Topic</label>
            <select
              value={filterUnitId}
              onChange={(e) => {
                setFilterUnitId(e.target.value);
                sounds.pop();
              }}
              disabled={!filterSubjectId}
              className="w-full text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">All Units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  📖 {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Resource Type</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                sounds.pop();
              }}
              className="w-full text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All Formats</option>
              <option value="pdf">📄 PDFs</option>
              <option value="html">🎮 Interactive / Sim</option>
              <option value="document">📝 Worksheets / Word</option>
              <option value="video">🎬 Videos</option>
              <option value="audio">🎵 Audio</option>
              <option value="image">🖼️ Pictures</option>
              <option value="other">📦 Code &amp; Others</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table / Grid Card Container */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm space-y-4">
        {/* Header row with count & active filter tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
              <span>Uploaded Learning Files</span>
              <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-0.5 rounded-full font-extrabold">
                {resources.length} {resources.length === 1 ? 'file' : 'files'}
              </span>
            </h3>

            {filterClassId && (
              <span className="text-xs font-black text-sky-800 bg-sky-100 px-3 py-1 rounded-full border border-sky-300 flex items-center gap-1.5 shadow-xs">
                <span>Class:</span>
                <span>{classes.find((c) => c.id === filterClassId)?.name || 'Filtered'}</span>
                <button
                  onClick={() => {
                    sounds.pop();
                    setFilterClassId('');
                  }}
                  className="hover:text-rose-600 font-black ml-1"
                  title="Clear class filter"
                >
                  &times;
                </button>
              </span>
            )}

            {filterSubjectId && (
              <span className="text-xs font-black text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300 flex items-center gap-1.5 shadow-xs">
                <span>Subject:</span>
                <span>{subjects.find((s) => s.id === filterSubjectId)?.name || 'Filtered'}</span>
                <button
                  onClick={() => {
                    sounds.pop();
                    setFilterSubjectId('');
                  }}
                  className="hover:text-rose-600 font-black ml-1"
                  title="Clear subject filter"
                >
                  &times;
                </button>
              </span>
            )}

            {filterUnitId && (
              <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-xs">
                <span>Unit:</span>
                <span>{units.find((u) => u.id === filterUnitId)?.name || 'Filtered'}</span>
                <button
                  onClick={() => {
                    sounds.pop();
                    setFilterUnitId('');
                  }}
                  className="hover:text-rose-600 font-black ml-1"
                  title="Clear unit filter"
                >
                  &times;
                </button>
              </span>
            )}
          </div>

          <button
            onClick={() => {
              sounds.pop();
              loadResources();
            }}
            className="text-xs font-bold text-slate-500 hover:text-sky-600 flex items-center gap-1"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          viewMode === 'table' ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-3 bg-slate-100 rounded-md w-1/4" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full w-24 hidden sm:block" />
                  <div className="h-6 bg-slate-200 rounded-full w-20 hidden md:block" />
                  <div className="h-8 bg-slate-200 rounded-xl w-32" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 animate-pulse space-y-4">
                  <div className="h-28 bg-slate-200 rounded-2xl w-full" />
                  <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-9 bg-slate-200 rounded-2xl w-full" />
                </div>
              ))}
            </div>
          )
        ) : resources.length === 0 ? (
          <EmptyState
            title="No files found matching criteria!"
            message="No files have been uploaded for this filter selection yet. Click 'Upload Resource' to add interactive games, worksheets, PDFs, or media."
            icon="folder"
            actionLabel="Upload First File"
            onAction={() => {
              sounds.pop();
              setIsUploadOpen(true);
            }}
          />
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Resource &amp; Type</th>
                  <th className="pb-3">Class &amp; Course</th>
                  <th className="pb-3">Unit / Topic</th>
                  <th className="pb-3">Size &amp; Date</th>
                  <th className="pb-3 text-center">Engagement</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((res) => {
                  const meta = getFileCategoryMeta(res.file_name, res.mime_type);
                  const isCurDownloading = downloadingId === res.id;
                  const isCurSuccess = downloadSuccessId === res.id;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Title & file name with format badge */}
                      <td className="py-3.5 pl-2 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner border flex-shrink-0 ${meta.iconBg} ${meta.badgeBorder} ${meta.iconColor}`}
                          >
                            {renderCategoryIcon(meta.category, 'w-5 h-5')}
                          </div>

                          <div className="min-w-0">
                            <div
                              onClick={() => {
                                sounds.pop();
                                setPreviewResource(res);
                              }}
                              className="font-extrabold text-slate-800 text-sm group-hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1.5"
                              title="Click to preview file"
                            >
                              <span className="truncate">{res.title}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]"
                                title={res.file_name}
                              >
                                {res.file_name}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase border ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
                              >
                                {meta.ext.replace('.', '') || meta.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Subject */}
                      <td className="py-3.5">
                        <div className="font-extrabold text-slate-700 flex items-center gap-1">
                          <span>🎒</span>
                          <span>{res.class_name || 'Classroom'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {res.subject_name || 'General Course'}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5">
                        <span className="bg-sky-50 text-sky-800 font-bold px-2.5 py-1 rounded-xl border border-sky-200 text-[11px] inline-flex items-center gap-1">
                          <span>📖</span>
                          <span className="truncate max-w-[130px]">{res.unit_name || 'Unit Study'}</span>
                        </span>
                      </td>

                      {/* Size & Upload Date */}
                      <td className="py-3.5">
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span>{formatBytes(res.file_size)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span>{formatUploadDate(res.created_at)}</span>
                        </div>
                      </td>

                      {/* Engagement stats */}
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-bold">
                          <span title="Student Views">👁️ {res.view_count || 0}</span>
                          <span className="text-slate-300">•</span>
                          <span title="Student Downloads">📥 {res.download_count || 0}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button
                            onClick={() => {
                              sounds.pop();
                              setPreviewResource(res);
                            }}
                            title="Inspect &amp; Preview File"
                            className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Direct Download Button */}
                          <button
                            onClick={() => handleDownloadFile(res)}
                            disabled={isCurDownloading}
                            title="Direct Download File"
                            className={`p-2 rounded-xl border transition-all ${
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

                          {/* Open in New Tab Button */}
                          <button
                            onClick={() => handleOpenInNewTab(res)}
                            title="Open raw in new browser tab"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              sounds.pop();
                              setEditingResource(res);
                              setEditTitle(res.title);
                              setEditDesc(res.description || '');
                            }}
                            title="Edit Title &amp; Teacher Note"
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteResource(res.id, res.title)}
                            title="Delete Resource"
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
          /* CARDS / GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((res) => {
              const meta = getFileCategoryMeta(res.file_name, res.mime_type);
              const isCurDownloading = downloadingId === res.id;
              const isCurSuccess = downloadSuccessId === res.id;

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col overflow-hidden group"
                >
                  {/* Card Visual Banner */}
                  <div
                    onClick={() => {
                      sounds.pop();
                      setPreviewResource(res);
                    }}
                    className={`h-32 p-4 cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all ${meta.iconBg}`}
                  >
                    <div className="flex items-center justify-between z-10">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${meta.badgeBg} ${meta.badgeColor} ${meta.badgeBorder}`}
                      >
                        {meta.label}
                      </span>

                      <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full shadow-xs">
                        {formatBytes(res.file_size)}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-4xl transform group-hover:scale-110 transition-transform">
                      {meta.emoji}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 z-10">
                      <span className="truncate max-w-[120px] bg-white/70 px-2 py-0.5 rounded-md">
                        {res.class_name || 'Class'}
                      </span>
                      <span className="bg-white/70 px-2 py-0.5 rounded-md">
                        {formatUploadDate(res.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4
                        onClick={() => {
                          sounds.pop();
                          setPreviewResource(res);
                        }}
                        className="font-black text-slate-800 text-sm font-display line-clamp-2 hover:text-sky-600 transition-colors cursor-pointer mb-1"
                        title={res.title}
                      >
                        {res.title}
                      </h4>
                      <p
                        className="text-xs text-slate-400 font-medium truncate mb-2"
                        title={res.file_name}
                      >
                        {res.file_name}
                      </p>

                      {res.description ? (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl">
                          {res.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-300 italic">No notes added.</p>
                      )}
                    </div>

                    {/* Unit & Stats Tag */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                      <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 truncate max-w-[130px]">
                        📖 {res.unit_name || 'Unit'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>👁️ {res.view_count || 0}</span>
                        <span>📥 {res.download_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => {
                        sounds.pop();
                        setPreviewResource(res);
                      }}
                      className="btn-bouncy flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-pop-blue"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleDownloadFile(res)}
                      disabled={isCurDownloading}
                      title="Download file directly"
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
                      onClick={() => handleOpenInNewTab(res)}
                      title="Open in new tab"
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        sounds.pop();
                        setEditingResource(res);
                        setEditTitle(res.title);
                        setEditDesc(res.description || '');
                      }}
                      title="Edit Details"
                      className="p-2 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteResource(res.id, res.title)}
                      title="Delete"
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-pop">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border-4 border-amber-300 space-y-4">
            <h3 className="text-lg font-bold font-display text-slate-800">Edit Resource Details</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xs font-bold bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Note</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full text-xs font-medium bg-white border-2 border-slate-200 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingResource(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-bouncy px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-pop-yellow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Management Modals */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        classes={classes}
        initialClassId={filterClassId}
        initialSubjectId={filterSubjectId}
        initialUnitId={filterUnitId}
        onUploadSuccess={() => {
          loadResources();
          loadClasses();
        }}
      />

      <ClassManagerModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={classes}
        onRefresh={() => {
          loadClasses();
          loadResources();
        }}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        classes={classes}
        initialClassId={filterClassId}
        onSuccess={() => {
          if (filterClassId) loadSubjects(filterClassId);
          loadResources();
        }}
      />

      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        subjects={subjects}
        initialSubjectId={filterSubjectId}
        onSuccess={() => {
          if (filterSubjectId) loadUnits(filterSubjectId);
          loadResources();
        }}
      />

      {/* Comprehensive File Visualization & Preview Modal */}
      {previewResource && (
        <FilePreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onResourceUpdated={loadResources}
        />
      )}
    </div>
  );
}
