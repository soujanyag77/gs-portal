export interface ParsedFileInfo {
  fileName: string;
  className: string | null;
  gradeLevel: string;
  classIcon: string;
  classColor: string;
  subjectName: string | null;
  subjectIcon: string;
  subjectColor: string;
  unitName: string | null;
  title: string;
  confidence: 'high' | 'medium' | 'low';
}

const COMMON_SUBJECTS: Record<string, { icon: string; color: string }> = {
  science: { icon: '🧪', color: '#10b981' },
  physics: { icon: '⚡', color: '#6366f1' },
  biology: { icon: '🌱', color: '#22c55e' },
  chemistry: { icon: '⚗️', color: '#14b8a6' },
  math: { icon: '📐', color: '#38bdf8' },
  mathematics: { icon: '📐', color: '#38bdf8' },
  arithmetic: { icon: '🔢', color: '#0ea5e9' },
  algebra: { icon: '📊', color: '#0284c7' },
  reading: { icon: '📖', color: '#f59e0b' },
  english: { icon: '📝', color: '#f59e0b' },
  language: { icon: '🗣️', color: '#fbbf24' },
  phonics: { icon: '🔤', color: '#eab308' },
  art: { icon: '🎨', color: '#ec4899' },
  drawing: { icon: '🖍️', color: '#f43f5e' },
  music: { icon: '🎵', color: '#a855f7' },
  history: { icon: '🏛️', color: '#8b5cf6' },
  social: { icon: '🌍', color: '#06b6d4' },
  geography: { icon: '🗺️', color: '#14b8a6' },
  space: { icon: '🚀', color: '#6366f1' },
  astronomy: { icon: '🪐', color: '#8b5cf6' },
  robotics: { icon: '🤖', color: '#3b82f6' },
  coding: { icon: '💻', color: '#2563eb' },
};

const GRADE_DEFAULTS: Record<string, { icon: string; color: string }> = {
  'pre-k': { icon: '🧸', color: '#fb923c' },
  nursery: { icon: '🧸', color: '#fb923c' },
  lkg: { icon: '🧸', color: '#fb923c' },
  ukg: { icon: '🧸', color: '#fb923c' },
  kindergarten: { icon: '🧸', color: '#fb923c' },
  'grade 1': { icon: '🎒', color: '#38bdf8' },
  'grade 2': { icon: '🚀', color: '#a855f7' },
  'grade 3': { icon: '🌟', color: '#facc15' },
  'grade 4': { icon: '🦁', color: '#4ade80' },
  'grade 5': { icon: '🔬', color: '#ec4899' },
  'grade 6': { icon: '🧭', color: '#06b6d4' },
  'grade 7': { icon: '⚡', color: '#f97316' },
  'grade 8': { icon: '🏆', color: '#8b5cf6' },
  'grade 9': { icon: '🔭', color: '#3b82f6' },
  'grade 10': { icon: '🎓', color: '#10b981' },
  'grade 11': { icon: '🏛️', color: '#6366f1' },
  'grade 12': { icon: '👑', color: '#e11d48' },
  // Roman Numerals
  'grade i': { icon: '🎒', color: '#38bdf8' },
  'grade ii': { icon: '🚀', color: '#a855f7' },
  'grade iii': { icon: '🌟', color: '#facc15' },
  'grade iv': { icon: '🦁', color: '#4ade80' },
  'grade v': { icon: '🔬', color: '#ec4899' },
  'grade vi': { icon: '🧭', color: '#06b6d4' },
  'grade vii': { icon: '⚡', color: '#f97316' },
  'grade viii': { icon: '🏆', color: '#8b5cf6' },
  'grade ix': { icon: '🔭', color: '#3b82f6' },
  'grade x': { icon: '🎓', color: '#10b981' },
  'grade xi': { icon: '🏛️', color: '#6366f1' },
  'grade xii': { icon: '👑', color: '#e11d48' },
  'class i': { icon: '🎒', color: '#38bdf8' },
  'class ii': { icon: '🚀', color: '#a855f7' },
  'class iii': { icon: '🌟', color: '#facc15' },
  'class iv': { icon: '🦁', color: '#4ade80' },
  'class v': { icon: '🔬', color: '#ec4899' },
  'class vi': { icon: '🧭', color: '#06b6d4' },
  'class vii': { icon: '⚡', color: '#f97316' },
  'class viii': { icon: '🏆', color: '#8b5cf6' },
  'class ix': { icon: '🔭', color: '#3b82f6' },
  'class x': { icon: '🎓', color: '#10b981' },
  'class xi': { icon: '🏛️', color: '#6366f1' },
  'class xii': { icon: '👑', color: '#e11d48' },
  default: { icon: '🎒', color: '#38bdf8' },
};

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
};

export function parseFileInfo(fileName: string): ParsedFileInfo {
  const dotIndex = fileName.lastIndexOf('.');
  const rawBase = (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).trim();

  // 1. Detect Class pattern (e.g. "Grade 1" to "Grade 12", "Class XII", "Kindergarten", "G12", "10th Grade")
  const classRegex = /(?:\[|\()?(Grade\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Class\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Kindergarten|Pre-?K|Nursery|LKG|UKG|(?:1[0-2]|[1-9])(?:st|nd|rd|th)\s*Grade|G(?:1[0-2]|[1-9]))(?:\]|\))?/i;
  const classMatch = rawBase.match(classRegex);

  let className: string | null = null;
  let gradeLevel = 'Grade 1';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (classMatch) {
    confidence = 'high';
    let matchedStr = classMatch[1].trim();

    if (/^G(1[0-2]|[1-9])$/i.test(matchedStr)) {
      matchedStr = `Grade ${matchedStr.slice(1)}`;
    } else if (/^K$/i.test(matchedStr)) {
      matchedStr = 'Kindergarten';
    } else if (/^(1[0-2]|[1-9])(?:st|nd|rd|th)\s*Grade$/i.test(matchedStr)) {
      const num = matchedStr.match(/\d+/)?.[0] || '1';
      matchedStr = `Grade ${num}`;
    } else if (/(?:Grade|Class)\s*(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)$/i.test(matchedStr)) {
      const roman = matchedStr.split(/\s+/)[1].toLowerCase();
      const num = ROMAN_NUMERALS[roman];
      if (num) {
        matchedStr = `Grade ${num} (Class ${roman.toUpperCase()})`;
      }
    }

    className = matchedStr.charAt(0).toUpperCase() + matchedStr.slice(1);
    gradeLevel = className;
  }

  // 2. Remove bracketed class tag if present and split remainder into parts
  const sanitized = rawBase
    .replace(/\[([^\]]+)\]/g, ' - $1 - ')
    .replace(/\(([^\)]+)\)/g, ' - $1 - ');

  const parts = sanitized
    .split(/\s*[-_|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let subjectName: string | null = null;
  let subjectIcon = '📚';
  let subjectColor = '#38bdf8';
  let unitName: string | null = null;
  let title = rawBase;

  // Search parts for Subject keywords
  for (const part of parts) {
    const lower = part.toLowerCase();
    for (const [key, val] of Object.entries(COMMON_SUBJECTS)) {
      if (lower === key || lower.startsWith(key) || lower.endsWith(key)) {
        subjectName = part.charAt(0).toUpperCase() + part.slice(1);
        subjectIcon = val.icon;
        subjectColor = val.color;
        break;
      }
    }
    if (subjectName) break;
  }

  // Search parts for Unit keywords (e.g. "Unit 1", "Chapter 2", "Topic 3")
  const unitPart = parts.find((p) => /^(Unit|Chapter|Topic|Module|Lesson)\s*\d*/i.test(p));
  if (unitPart) {
    unitName = unitPart;
  } else if (parts.length >= 3 && !unitName) {
    // If we have 3 or more parts, 3rd part often represents unit or chapter
    unitName = parts[2];
  }

  // Determine Title: usually the last part or descriptive part
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // If last part is not just "Grade X", use it as title
    if (!classRegex.test(lastPart)) {
      title = lastPart;
    } else {
      title = parts[0];
    }
  }

  // Clean title capitalization
  title = title.replace(/[-_]/g, ' ').trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Match class icon and color
  const gradeKey = (className || 'default').toLowerCase();
  const classStyle = GRADE_DEFAULTS[gradeKey] || GRADE_DEFAULTS.default;

  return {
    fileName,
    className,
    gradeLevel,
    classIcon: classStyle.icon,
    classColor: classStyle.color,
    subjectName,
    subjectIcon,
    subjectColor,
    unitName: unitName || (subjectName ? `Unit 1: Introduction to ${subjectName}` : 'Unit 1: General Learning'),
    title: title || 'Learning Resource',
    confidence,
  };
}
