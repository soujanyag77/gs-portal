'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowRight,
  Eye,
  School,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ResourceCard from '@/components/student/ResourceCard';
import PdfViewerModal from '@/components/student/PdfViewerModal';
import HtmlInteractiveModal from '@/components/student/HtmlInteractiveModal';
import MediaViewerModal from '@/components/student/MediaViewerModal';
import ImageLightboxModal from '@/components/student/ImageLightboxModal';
import DocumentCardModal from '@/components/student/DocumentCardModal';
import EmptyState from '@/components/EmptyState';
import { sounds } from '@/components/sound-effects';
import { fireConfetti } from '@/components/ConfettiCelebration';
import { safeFetchJson } from '@/lib/api-client';
import { User, ClassItem, SubjectItem, UnitItem, ResourceItem } from '@/lib/types';

export default function StudentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isTeacherPreview, setIsTeacherPreview] = useState<boolean>(false);

  // Class Selection (supports cross-class learning for all students)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [currentClassId, setCurrentClassId] = useState<string>('');

  // Curriculum State
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // Accordion state: which unit ids are expanded
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});

  // Filter & search state
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Active resource modals
  const [activePdf, setActivePdf] = useState<ResourceItem | null>(null);
  const [activeHtml, setActiveHtml] = useState<ResourceItem | null>(null);
  const [activeMedia, setActiveMedia] = useState<ResourceItem | null>(null);
  const [activeImage, setActiveImage] = useState<ResourceItem | null>(null);
  const [activeDoc, setActiveDoc] = useState<ResourceItem | null>(null);

  // 1. Check auth and initialize portal
  useEffect(() => {
    async function initPortal() {
      try {
        const authData = await safeFetchJson('/api/auth/me');
        if (!authData.authenticated || !authData.user) {
          router.push('/student/login');
          return;
        }

        const currentUser = authData.user;
        setUser(currentUser);
        setIsTeacherPreview(currentUser.role === 'teacher');

        // Load all classes
        const classData = await safeFetchJson('/api/classes');
        const classList: ClassItem[] = classData.classes || [];
        setClasses(classList);

        // Set initial class: student's class, or first class in list
        const initialClassId = currentUser.class_id || (classList.length > 0 ? classList[0].id : '');
        setCurrentClassId(initialClassId);

        // Load subjects for initial class
        if (initialClassId) {
          await loadSubjectsForClass(initialClassId);
        }
      } catch (err) {
        console.error('Portal init error:', err);
        router.push('/student/login');
      } finally {
        setLoading(false);
      }
    }
    initPortal();
  }, [router]);

  // Load subjects when class changes
  async function loadSubjectsForClass(classId: string) {
    try {
      const data = await safeFetchJson(`/api/subjects?class_id=${classId}`);
      const subList: SubjectItem[] = data.subjects || [];
      setSubjects(subList);
      if (subList.length > 0) {
        setSelectedSubjectId(subList[0].id);
      } else {
        setSelectedSubjectId('');
        setUnits([]);
        setResources([]);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjects([]);
      setSelectedSubjectId('');
    }
  }

  // Handle class switcher (Cross-Class Interest Exploration)
  const handleClassChange = async (newClassId: string) => {
    sounds.pop();
    setCurrentClassId(newClassId);
    await loadSubjectsForClass(newClassId);
  };

  // 2. Load units whenever selected subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      return;
    }
    async function loadUnits() {
      try {
        const data = await safeFetchJson(`/api/units?subject_id=${selectedSubjectId}`);
        const unitList: UnitItem[] = data.units || [];
        setUnits(unitList);
        const initialExpanded: Record<string, boolean> = {};
        unitList.forEach((u) => {
          initialExpanded[u.id] = true;
        });
        setExpandedUnitIds(initialExpanded);
      } catch (err) {
        console.error('Error loading units:', err);
        setUnits([]);
      }
    }
    loadUnits();
  }, [selectedSubjectId]);

  // 3. Load resources for active class & subject
  useEffect(() => {
    if (!currentClassId) return;
    async function loadResources() {
      try {
        const params = new URLSearchParams();
        params.append('class_id', currentClassId);
        if (selectedSubjectId) params.append('subject_id', selectedSubjectId);
        if (selectedType !== 'all') params.append('file_type', selectedType);
        if (searchQuery) params.append('search', searchQuery);

        const data = await safeFetchJson(`/api/resources?${params.toString()}`);
        setResources(data.resources || []);
      } catch (err) {
        console.error('Error loading resources:', err);
        setResources([]);
      }
    }
    loadResources();
  }, [currentClassId, selectedSubjectId, selectedType, searchQuery]);

  // Log activity event
  const logStudentEvent = async (resource: ResourceItem, action: 'view' | 'download' | 'interact') => {
    try {
      await safeFetchJson('/api/analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resource.id,
          action_type: action,
          student_id: user?.id,
          student_name: isTeacherPreview ? `${user?.name} (Teacher Preview)` : user?.name,
        }),
      });
      // Increment local stars counter for students
      if (!isTeacherPreview) {
        setUser((prev) => (prev ? { ...prev, stars: (prev.stars || 0) + 1 } : null));
      }
    } catch (err) {
      console.error('Failed to log event:', err);
    }
  };

  // Open resource in new tab as per format of file
  const handleOpenResource = (resource: ResourceItem) => {
    sounds.fanfare();
    fireConfetti();
    logStudentEvent(resource, resource.file_type === 'html' ? 'interact' : 'view');

    const fileUrl = resource.file_url || `/api/resources/${resource.id}/file`;

    // 1. Interactive HTML5 Packages / Games -> Open in new tab
    if (resource.file_type === 'html') {
      const openUrl = resource.interactive_entry_url || fileUrl;
      window.open(openUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. PDF Documents -> Browser Native PDF Reader in new tab
    if (resource.file_type === 'pdf') {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 3. Audio / Video / Images -> Direct Media stream in new tab
    if (['audio', 'video', 'image'].includes(resource.file_type)) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 4. Word / Office Documents (.docx, .pptx, .xlsx) -> Interactive Reader or Stream in new tab
    if (resource.file_type === 'document' || resource.file_name?.match(/\.(docx?|pptx?|xlsx?)$/i)) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 5. Default fallback -> open in new tab
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadResource = (resource: ResourceItem) => {
    sounds.fanfare();
    fireConfetti();
    logStudentEvent(resource, 'download');
    const fileUrl = resource.file_url || `/api/resources/${resource.id}/file`;
    const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = resource.file_name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleUnitAccordion = (unitId: string) => {
    sounds.pop();
    setExpandedUnitIds((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-display text-lg">
        Opening Wonder Learning Library...
      </div>
    );
  }

  const currentClass = classes.find((c) => c.id === currentClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50/50 bg-polka">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 👩‍🏫 Educator Preview Banner (Active when teacher is viewing as student) */}
        {isTeacherPreview && (
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 text-white px-5 py-4 rounded-3xl shadow-lg border-2 border-purple-300 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pop">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <span className="text-3xl">👩‍🏫</span>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-purple-200 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>Educator Student View Mode</span>
                </div>
                <div className="text-xs font-medium text-white mt-0.5">
                  You are previewing the learning portal through a student&apos;s eyes. Switch any classroom below to verify resources and simulations.
                </div>
              </div>
            </div>
            <Link
              href="/teacher/dashboard"
              onClick={() => sounds.pop()}
              className="btn-bouncy px-4 py-2.5 rounded-2xl bg-white text-purple-900 font-black text-xs shadow-sm hover:bg-purple-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span>↩ Return to Teacher Dashboard</span>
            </Link>
          </div>
        )}

        {/* Welcome Student Hero Card */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 rounded-4xl p-6 sm:p-8 text-white shadow-bouncy flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-5 text-center sm:text-left z-10">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl shadow-lg border-2 border-white/40 animate-bounce">
              {user?.avatar || (isTeacherPreview ? '👩‍🏫' : '🦊')}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-black uppercase tracking-wider mb-2 border border-white/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{user?.class_name || (isTeacherPreview ? 'Educator View' : 'All Classes Unlocked')}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight leading-tight">
                Welcome, {user?.name || 'Explorer'}! 🚀
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 font-bold mt-1">
                Explore exciting stories, interactive games, science videos, and worksheets across all classrooms!
              </p>
            </div>
          </div>

          {/* Gamified Star Badge (or Teacher View Badge) */}
          <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-3xl border-2 border-white/40 flex items-center gap-3 shadow-md z-10">
            <span className="text-3xl">{isTeacherPreview ? '🎓' : '⭐'}</span>
            <div>
              <div className="text-2xl font-black font-display leading-tight">
                {isTeacherPreview ? 'Preview' : user?.stars || 0}
              </div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-100">
                {isTeacherPreview ? 'Educator Mode' : 'Explorer Stars'}
              </div>
            </div>
          </div>
        </div>

        {/* 🏫 CLASSROOM SWITCHER / EXPLORER BAR (Cross-Class Interest Access) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-3 border-sky-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border"
              style={{
                backgroundColor: `${currentClass?.color || '#38bdf8'}25`,
                borderColor: currentClass?.color || '#38bdf8',
              }}
            >
              {currentClass?.icon || '🎒'}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>Currently Exploring:</span>
              </div>
              <div className="text-lg font-black font-display text-slate-800 flex items-center gap-2">
                <span>{currentClass?.name || 'Classroom Library'}</span>
                {currentClass?.grade_level && (
                  <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {currentClass.grade_level}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cross-Class Dropdown */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <span className="text-xs font-black text-slate-600 whitespace-nowrap hidden sm:inline">
              Explore Another Class:
            </span>
            <div className="relative flex-1 md:w-72">
              <select
                value={currentClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full text-xs font-extrabold bg-slate-50 hover:bg-slate-100 border-2 border-sky-300 rounded-2xl px-4 py-3 focus:bg-white focus:border-sky-500 focus:outline-none cursor-pointer appearance-none text-slate-800 transition-colors pr-10"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '🎒'} {c.name} {c.grade_level ? `(${c.grade_level})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Selector Bar: Large, Colorful Bouncy Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black font-display text-slate-800 flex items-center gap-2">
              <span>📚</span>
              <span>Class Subjects &amp; Courses</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">
              Tap a subject to explore its units
            </span>
          </div>

          {subjects.length === 0 ? (
            <EmptyState
              title={`No subjects in ${currentClass?.name || 'this class'} yet!`}
              message="Your teacher is currently preparing lessons for this class. Select another class from the dropdown above to explore other materials!"
              icon="backpack"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {subjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      sounds.pop();
                      setSelectedSubjectId(sub.id);
                    }}
                    style={{
                      borderColor: isSelected ? sub.color_code : 'transparent',
                    }}
                    className={`btn-bouncy p-4 rounded-3xl text-center border-3 transition-all flex flex-col items-center justify-center transform hover:scale-105 cursor-pointer ${
                      isSelected
                        ? 'bg-white shadow-bouncy scale-105 ring-2 ring-offset-2'
                        : 'bg-white/70 hover:bg-white shadow-sm'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-inner"
                      style={{ backgroundColor: `${sub.color_code}25` }}
                    >
                      {sub.icon || '📚'}
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 line-clamp-1">
                      {sub.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {sub.unit_count || 0} Topics
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search & Format Filter Chips */}
        <div className="bg-white rounded-3xl p-4 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Format Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Formats', emoji: '🌟' },
              { id: 'pdf', label: 'PDFs', emoji: '📄' },
              { id: 'html', label: 'Games & Sims', emoji: '🎮' },
              { id: 'video', label: 'Videos', emoji: '🎬' },
              { id: 'audio', label: 'Audio', emoji: '🎵' },
              { id: 'image', label: 'Pictures', emoji: '🖼️' },
              { id: 'document', label: 'Worksheets', emoji: '📝' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sounds.pop();
                  setSelectedType(f.id);
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                  selectedType === f.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search worksheets, videos..."
              className="w-full text-xs font-bold pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Collapsible Unit Accordions */}
        <div className="space-y-6">
          {units.length === 0 ? (
            <EmptyState
              title="No topics in this subject yet!"
              message="Your teacher is currently organizing units for this subject. Switch subjects or choose another classroom above to explore!"
              icon="folder"
            />
          ) : (
            units.map((unit) => {
              const unitResources = resources.filter((r) => r.unit_id === unit.id);
              const isExpanded = expandedUnitIds[unit.id] ?? true;

              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-4xl border-3 border-slate-100 shadow-sm overflow-hidden transition-all"
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleUnitAccordion(unit.id)}
                    className="p-5 sm:p-6 bg-slate-50/70 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shadow-inner">
                        📖
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black font-display text-slate-800">
                            {unit.name}
                          </h3>
                          <span className="bg-sky-100 text-sky-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                            {unitResources.length} {unitResources.length === 1 ? 'Resource' : 'Resources'}
                          </span>
                        </div>
                        {unit.description && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
                        {isExpanded ? 'Hide' : 'Show'} Materials
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content (Resource Cards Grid) */}
                  {isExpanded && (
                    <div className="p-6">
                      {unitResources.length === 0 ? (
                        <EmptyState
                          title="Nothing here yet!"
                          message="No files have been added to this topic yet."
                          icon="backpack"
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {unitResources.map((res) => (
                            <ResourceCard
                              key={res.id}
                              resource={res}
                              onOpen={handleOpenResource}
                              onDownload={handleDownloadResource}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Format-Specific Modal Viewers */}
      {activePdf && (
        <PdfViewerModal
          resource={activePdf}
          onClose={() => setActivePdf(null)}
          onDownload={() => handleDownloadResource(activePdf)}
        />
      )}

      {activeHtml && (
        <HtmlInteractiveModal
          resource={activeHtml}
          onClose={() => setActiveHtml(null)}
          onDownload={() => handleDownloadResource(activeHtml)}
        />
      )}

      {activeMedia && (
        <MediaViewerModal
          resource={activeMedia}
          onClose={() => setActiveMedia(null)}
          onDownload={() => handleDownloadResource(activeMedia)}
        />
      )}

      {activeImage && (
        <ImageLightboxModal
          resource={activeImage}
          onClose={() => setActiveImage(null)}
          onDownload={() => handleDownloadResource(activeImage)}
        />
      )}

      {activeDoc && (
        <DocumentCardModal
          resource={activeDoc}
          onClose={() => setActiveDoc(null)}
          onDownload={() => handleDownloadResource(activeDoc)}
        />
      )}
    </div>
  );
}
