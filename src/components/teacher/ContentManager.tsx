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
} from 'lucide-react';
import { ClassItem, SubjectItem, UnitItem, ResourceItem, FileType } from '@/lib/types';
import { FILE_TYPE_MAP, formatFileSize } from '@/lib/file-types';
import EmptyState from '../EmptyState';
import FileUploadModal from './FileUploadModal';
import ClassManagerModal from './ClassManagerModal';
import SubjectModal from './SubjectModal';
import UnitModal from './UnitModal';
import PdfViewerModal from '../student/PdfViewerModal';
import HtmlInteractiveModal from '../student/HtmlInteractiveModal';
import MediaViewerModal from '../student/MediaViewerModal';
import ImageLightboxModal from '../student/ImageLightboxModal';
import DocumentCardModal from '../student/DocumentCardModal';
import { sounds } from '../sound-effects';

export default function ContentManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // Cascading Filter Selection
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('');
  const [filterUnitId, setFilterUnitId] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  // Edit Resource modal state
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  // Preview Resource modal state
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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
            Manage your Grade classrooms, Subjects, Units, and upload kid-friendly learning resources (PDFs, HTML5 interactive games, audio stories, video lessons, and worksheets).
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
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <School className="w-4 h-4" />
            <span>Class & Students</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setIsSubjectModalOpen(true);
            }}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>+ Subject</span>
          </button>

          <button
            onClick={() => {
              sounds.pop();
              setIsUnitModalOpen(true);
            }}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-1.5"
          >
            <Folder className="w-4 h-4" />
            <span>+ Unit</span>
          </button>

          <Link
            href="/student/portal"
            onClick={() => sounds.pop()}
            className="btn-bouncy px-4 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-xs shadow-pop-green flex items-center gap-1.5 ml-auto sm:ml-0"
            title="Preview learning portal as a student"
          >
            <Eye className="w-4 h-4" />
            <span>Student View 👀</span>
          </Link>
        </div>
      </div>

      {/* Class-Wise Uploaded Files Overview Bar */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-lg shadow-inner">
              📂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 font-display">
                  Class-Wise Uploaded Materials
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {totalUploadsCount} Total Uploads
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Click any classroom card below to instantly view and manage its uploaded files
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.pop();
              setFilterClassId('');
              setFilterSubjectId('');
              setFilterUnitId('');
            }}
            className={`btn-bouncy px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              !filterClassId
                ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>🌟</span>
            <span>All Classrooms ({totalUploadsCount} files)</span>
          </button>
        </div>

        {/* Classroom Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {classes.map((cls) => {
            const isSelected = filterClassId === cls.id;
            const classResCount = resources.filter(
              (r) =>
                r.class_id === cls.id ||
                (r.class_name && r.class_name.trim().toLowerCase() === cls.name.trim().toLowerCase())
            ).length;
            const fileCount = Math.max(
              cls.resource_count || 0,
              classResCount,
              filterClassId === cls.id ? resources.length : 0
            );
            return (
              <button
                key={cls.id}
                onClick={() => {
                  sounds.pop();
                  setFilterClassId(cls.id);
                }}
                className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between group cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 shadow-bouncy ring-2 ring-sky-300 transform scale-102'
                    : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${cls.color || '#38bdf8'}20` }}
                  >
                    {cls.icon || '🎒'}
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      fileCount > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {fileCount} {fileCount === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <div>
                  <div className="font-black text-xs text-slate-800 group-hover:text-sky-600 transition-colors line-clamp-1">
                    {cls.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    {cls.grade_level || 'Grade'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cascading Filters & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Cascading Filter:
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Class &rarr; Subject &rarr; Unit
            </span>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or topics..."
              className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-sky-500 focus:outline-none"
            />
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
              <option value="video">🎬 Videos</option>
              <option value="audio">🎵 Audio</option>
              <option value="image">🖼️ Pictures</option>
              <option value="document">📝 Worksheets / Docs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table / Grid */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
              <span>Learning Resources</span>
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
          </div>

          {classes.length === 0 && (
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ⚠️ Start by adding a Class first!
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold text-sm">
            Loading materials...
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            title="Nothing here yet!"
            message="No files have been uploaded to this selection yet. Click 'Upload Resource' to add worksheets, games, videos, or PDFs for your students!"
            icon="folder"
            actionLabel="Upload First File"
            onAction={() => {
              sounds.pop();
              setIsUploadOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Resource</th>
                  <th className="pb-3">Class &amp; Subject</th>
                  <th className="pb-3">Unit / Topic</th>
                  <th className="pb-3">Type &amp; Size</th>
                  <th className="pb-3 text-center">Engagement</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((res) => {
                  const typeInfo = FILE_TYPE_MAP[res.file_type] || FILE_TYPE_MAP.other;
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Title & file name */}
                      <td className="py-3.5 pl-2 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{typeInfo.emoji}</span>
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm group-hover:text-sky-600 transition-colors">
                              {res.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                              {res.file_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Subject */}
                      <td className="py-3.5">
                        <div className="font-bold text-slate-700">{res.class_name || 'Class'}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {res.subject_name || 'General'}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5">
                        <span className="bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded-lg border border-sky-200 text-[11px]">
                          📖 {res.unit_name || 'Unit'}
                        </span>
                      </td>

                      {/* Type & Size */}
                      <td className="py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-black text-[10px] border mr-2 ${typeInfo.badgeBg} ${typeInfo.badgeColor}`}
                        >
                          {typeInfo.label}
                        </span>
                        <span className="text-slate-400 font-semibold">
                          {formatFileSize(res.file_size)}
                        </span>
                      </td>

                      {/* Engagement stats */}
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-bold">
                          <span title="Views">👁️ {res.view_count || 0}</span>
                          <span className="text-slate-300">•</span>
                          <span title="Downloads">📥 {res.download_count || 0}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            onClick={() => {
                              sounds.pop();
                              setPreviewResource(res);
                            }}
                            title="Preview Kid View"
                            className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              sounds.pop();
                              setEditingResource(res);
                              setEditTitle(res.title);
                              setEditDesc(res.description || '');
                            }}
                            title="Edit Details"
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteResource(res.id, res.title)}
                            title="Delete Resource"
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
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
                className="btn-bouncy px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-pop-yellow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Curriculum Management */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          loadResources();
          loadClasses();
        }}
        onUploadSuccess={() => {
          loadResources();
          loadClasses();
        }}
        classes={classes}
        initialClassId={filterClassId}
        initialSubjectId={filterSubjectId}
        initialUnitId={filterUnitId}
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
          loadClasses();
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

      {/* Student View Modals for Teacher Preview */}
      {previewResource && previewResource.file_type === 'pdf' && (
        <PdfViewerModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => {
            window.open(`${previewResource.file_url}?download=1`, '_blank');
          }}
        />
      )}
      {previewResource && previewResource.file_type === 'html' && (
        <HtmlInteractiveModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
      {previewResource && ['audio', 'video'].includes(previewResource.file_type) && (
        <MediaViewerModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => {
            window.open(`${previewResource.file_url}?download=1`, '_blank');
          }}
        />
      )}
      {previewResource && previewResource.file_type === 'image' && (
        <ImageLightboxModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => {
            window.open(`${previewResource.file_url}?download=1`, '_blank');
          }}
        />
      )}
      {previewResource && previewResource.file_type === 'document' && (
        <DocumentCardModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={() => {
            window.open(`${previewResource.file_url}?download=1`, '_blank');
          }}
        />
      )}
    </div>
  );
}
