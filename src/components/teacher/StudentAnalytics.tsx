'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Download,
  Flame,
  Activity,
  RefreshCw,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
} from 'lucide-react';
import { ClassItem, AnalyticsSummary } from '@/lib/types';
import EmptyState from '../EmptyState';
import { sounds } from '../sound-effects';

interface StudentAnalyticsProps {
  classes: ClassItem[];
}

export default function StudentAnalytics({ classes }: StudentAnalyticsProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  async function loadAnalytics() {
    try {
      const url =
        selectedClassId && selectedClassId !== 'all'
          ? `/api/analytics?class_id=${selectedClassId}`
          : '/api/analytics';

      const res = await fetch(url);
      const data: AnalyticsSummary = await res.json();
      setSummary(data);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh live activity every 12 seconds
    const interval = setInterval(loadAnalytics, 12000);
    return () => clearInterval(interval);
  }, [selectedClassId]);

  const handleManualRefresh = () => {
    sounds.pop();
    setLoading(true);
    loadAnalytics();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'view':
        return <span className="bg-sky-100 text-sky-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">👁️ Viewed</span>;
      case 'download':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">📥 Downloaded</span>;
      case 'interact':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">🎮 Played Game</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">Completed</span>;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header & Class Filter */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📊</span>
            <h2 className="text-2xl font-bold font-display text-slate-800">Student Analytics &amp; Activity</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time tracking of student engagement, topic interest, and access timestamps.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                sounds.pop();
              }}
              className="text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-2 focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '🎒'} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-600 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Live Sync</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Students */}
        <div className="bg-white rounded-3xl p-5 border-2 border-sky-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-slate-800">
              {summary?.totalActiveStudents || 0}
            </div>
            <div className="text-xs font-bold text-slate-500">Active Students</div>
            <div className="text-[10px] text-sky-600 font-semibold mt-0.5">Engaged with materials</div>
          </div>
        </div>

        {/* Total Materials Accessed */}
        <div className="bg-white rounded-3xl p-5 border-2 border-indigo-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-slate-800">
              {summary?.totalMaterialsAccessed || 0}
            </div>
            <div className="text-xs font-bold text-slate-500">Materials Explored</div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Unique files opened</div>
          </div>
        </div>

        {/* Weekly Views & Downloads */}
        <div className="bg-white rounded-3xl p-5 border-2 border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-inner">
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-slate-800">
              {(summary?.totalViewsThisWeek || 0) + (summary?.totalDownloadsThisWeek || 0)}
            </div>
            <div className="text-xs font-bold text-slate-500">Actions This Week</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {summary?.totalViewsThisWeek || 0} views • {summary?.totalDownloadsThisWeek || 0} downloads
            </div>
          </div>
        </div>

        {/* Most Popular Topic */}
        <div className="bg-white rounded-3xl p-5 border-2 border-amber-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
            <Flame className="w-7 h-7" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-extrabold text-slate-800 truncate">
              {summary?.mostPopularTopic?.unit_name || 'No Activity Yet'}
            </div>
            <div className="text-xs font-bold text-slate-500">Most Popular Topic</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
              {summary?.mostPopularTopic
                ? `${summary.mostPopularTopic.count} student interactions`
                : 'Awaiting student views'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Roster Breakdown & Topic Engagement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Roster Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" />
              <span>Student Roster Breakdown</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Click student card to view full history
            </span>
          </div>

          {!summary || summary.studentRoster.length === 0 ? (
            <EmptyState
              title="No students active yet!"
              message="Once your students log in with their PIN and explore worksheets or games, their exact activity and timestamps will appear here."
              icon="robot"
            />
          ) : (
            <div className="space-y-3">
              {summary.studentRoster.map((student) => {
                const isExpanded = expandedStudentId === student.student_id;
                return (
                  <div
                    key={student.student_id}
                    className="border-2 border-slate-100 hover:border-sky-200 rounded-2xl transition-all overflow-hidden"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => {
                        sounds.pop();
                        setExpandedStudentId(isExpanded ? null : student.student_id);
                      }}
                      className="p-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{student.avatar}</span>
                        <div>
                          <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                            <span>{student.student_name}</span>
                            <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                              {student.class_name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            Last Active:{' '}
                            {student.last_active !== 'Never'
                              ? formatRelativeTime(student.last_active)
                              : 'No activity yet'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="inline-block bg-amber-100 text-amber-900 font-black text-xs px-3 py-1 rounded-full border border-amber-300">
                            ⭐ {student.materials_accessed} materials explored
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded History List */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                        <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                          Exact Topics &amp; Files Referenced:
                        </div>
                        {student.recent_resources.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No access events recorded yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {student.recent_resources.map((res, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  {getActionBadge(res.action_type)}
                                  <span className="font-bold text-slate-700">{res.title}</span>
                                  <span className="text-slate-400 text-[11px]">
                                    ({res.subject} • {res.unit})
                                  </span>
                                </div>
                                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-300" />
                                  <span>{formatRelativeTime(res.accessed_at)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Topic Engagement Breakdown (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span>Topic Engagement</span>
            </h3>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
              Highest to Lowest
            </span>
          </div>

          {!summary || summary.topicEngagement.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No topic engagement data recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {summary.topicEngagement.map((topic, idx) => {
                const maxTotal = summary.topicEngagement[0]?.total || 1;
                const percentage = Math.round((topic.total / maxTotal) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-extrabold text-slate-700 truncate max-w-[180px]">
                        📖 {topic.unit_name}
                      </div>
                      <span className="font-black text-slate-900">{topic.total} actions</span>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>{topic.subject_name}</span>
                      <span>
                        👁️ {topic.views} • 📥 {topic.downloads} • 🎮 {topic.interacts}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Live Activity Feed */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            <span>Real-Time Live Activity Stream</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Auto-refreshes • Last sync: {lastRefreshed || 'Just now'}
          </span>
        </div>

        {!summary || summary.recentActivity.length === 0 ? (
          <EmptyState
            title="Awaiting student activity!"
            message="No activity logged yet. When students launch an interactive game, view a PDF, or download a worksheet, events stream here in real time."
            icon="activity"
          />
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {summary.recentActivity.map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs">
                    {log.student_name ? log.student_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800">
                      <span className="text-sky-700">{log.student_name}</span>{' '}
                      <span className="font-normal text-slate-500">
                        {log.action_type === 'view' && 'viewed'}
                        {log.action_type === 'download' && 'downloaded'}
                        {log.action_type === 'interact' && 'launched interactive'}
                        {log.action_type === 'complete' && 'completed'}
                      </span>{' '}
                      <span className="font-bold text-slate-900">&ldquo;{log.resource_title}&rdquo;</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {log.class_name} &bull; {log.subject_name} &bull; 📖 {log.unit_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {getActionBadge(log.action_type)}
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    {formatRelativeTime(log.accessed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
