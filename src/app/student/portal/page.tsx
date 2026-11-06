'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Star,
  Award,
  Filter,
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
import { User, SubjectItem, UnitItem, ResourceItem, FileType } from '@/lib/types';

export default function StudentPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  // Check auth and load student profile
  useEffect(() => {
    async function initStudent() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/student/login');
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.role !== 'student') {
          router.push('/student/login');
          return;
        }
        setUser(data.user);

        // Load subjects for student's class
        const classId = data.user.class_id;
        if (classId) {
          const subRes = await fetch(`/api/subjects?class_id=${classId}`);
          const subData = await subRes.json();
          setSubjects(subData.subjects || []);
          if (subData.subjects?.length > 0) {
            setSelectedSubjectId(subData.subjects[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        router.push('/student/login');
      } finally {
        setLoading(false);
      }
    }
    initStudent();
  }, [router]);

  // Load units whenever selected subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setUnits([]);
      return;
    }
    async function loadUnits() {
      try {
        const res = await fetch(`/api/units?subject_id=${selectedSubjectId}`);
        const data = await res.json();
        setUnits(data.units || []);
        // Expand all units by default for convenient browsing
        const initialExpanded: Record<string, boolean> = {};
        (data.units || []).forEach((u: UnitItem) => {
          initialExpanded[u.id] = true;
        });
        setExpandedUnitIds(initialExpanded);
      } catch (err) {
        console.error(err);
      }
    }
    loadUnits();
  }, [selectedSubjectId]);

  // Load resources for student's class & selected subject
  useEffect(() => {
    const classId = user?.class_id;
    if (!classId) return;
    async function loadResources() {
      try {
        const params = new URLSearchParams();
        params.append('class_id', classId!);
        if (selectedSubjectId) params.append('subject_id', selectedSubjectId);
        if (selectedType !== 'all') params.append('file_type', selectedType);
        if (searchQuery) params.append('search', searchQuery);

        const res = await fetch(`/api/resources?${params.toString()}`);
        const data = await res.json();
        setResources(data.resources || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadResources();
  }, [user, selectedSubjectId, selectedType, searchQuery]);

  // Log activity event
  const logStudentEvent = async (resource: ResourceItem, action: 'view' | 'download' | 'interact') => {
    try {
      await fetch('/api/analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resource.id,
          action_type: action,
          student_id: user?.id,
          student_name: user?.name,
        }),
      });
      // Increment student's local stars counter
      setUser((prev) => (prev ? { ...prev, stars: (prev.stars || 0) + 1 } : null));
    } catch (err) {
      console.error('Failed to log student event:', err);
    }
  };

  // Open resource in format-specific modal
  const handleOpenResource = (resource: ResourceItem) => {
    sounds.star();
    if (resource.file_type === 'html') {
      fireConfetti();
      setActiveHtml(resource);
      logStudentEvent(resource, 'interact');
    } else if (resource.file_type === 'pdf') {
      setActivePdf(resource);
      logStudentEvent(resource, 'view');
    } else if (['audio', 'video'].includes(resource.file_type)) {
      setActiveMedia(resource);
      logStudentEvent(resource, 'view');
    } else if (resource.file_type === 'image') {
      setActiveImage(resource);
      logStudentEvent(resource, 'view');
    } else {
      setActiveDoc(resource);
      logStudentEvent(resource, 'view');
    }
  };

  const handleDownloadResource = (resource: ResourceItem) => {
    sounds.fanfare();
    fireConfetti();
    logStudentEvent(resource, 'download');
    window.open(`${resource.file_url}?download=1`, '_blank');
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
        Opening your Class Library...
      </div>
    );
  }

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-white to-amber-50/50 bg-polka">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Student Hero Card */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 rounded-4xl p-6 sm:p-8 text-white shadow-bouncy flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-5 text-center sm:text-left z-10">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl shadow-lg border-2 border-white/40 animate-bounce">
              {user?.avatar || '🦊'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-black uppercase tracking-wider mb-2 border border-white/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{user?.class_name || 'My Class'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight leading-tight">
                Welcome back, {user?.name || 'Explorer'}! 🚀
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 font-bold mt-1">
                Explore exciting stories, interactive games, science videos, and worksheets!
              </p>
            </div>
          </div>

          {/* Gamified Star Badge */}
          <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-3xl border-2 border-white/40 flex items-center gap-3 shadow-md z-10">
            <span className="text-3xl">⭐</span>
            <div>
              <div className="text-2xl font-black font-display leading-tight">{user?.stars || 0}</div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-100">
                Explorer Stars
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Selector Bar: Large, Colorful Bouncy Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black font-display text-slate-800 flex items-center gap-2">
              <span>📚</span>
              <span>Your Class Subjects</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Tap a subject to explore its units
            </span>
          </div>

          {subjects.length === 0 ? (
            <EmptyState
              title="No subjects in your class yet!"
              message="Your teacher is currently preparing lessons and subjects for your class. Check back soon!"
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
                    className={`btn-bouncy p-4 rounded-3xl text-center border-3 transition-all flex flex-col items-center justify-center transform hover:scale-105 ${
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
              { id: 'audio', label: 'Stories', emoji: '🎵' },
              { id: 'image', label: 'Pictures', emoji: '🖼️' },
              { id: 'document', label: 'Worksheets', emoji: '📝' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sounds.pop();
                  setSelectedType(f.id);
                }}
                className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1 ${
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
              title="Nothing here yet!"
              message="Your teacher hasn't added units to this subject yet. Choose another subject or check back soon!"
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
                          message="Your teacher hasn't added files to this unit."
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
