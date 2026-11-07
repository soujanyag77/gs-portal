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
  ai: { icon: '🤖', color: '#6366f1' },
  'artificial intelligence': { icon: '🤖', color: '#6366f1' },
  cs: { icon: '💻', color: '#2563eb' },
  'computer science': { icon: '💻', color: '#2563eb' },
  coding: { icon: '💻', color: '#2563eb' },
  python: { icon: '🐍', color: '#3b82f6' },
  'machine learning': { icon: '🧠', color: '#8b5cf6' },
  'deep learning': { icon: '⚡', color: '#ec4899' },
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
  'grade x': { icon: '🎓', color: '#10b981' },
  'grade xi': { icon: '🏛️', color: '#6366f1' },
  'grade xii': { icon: '👑', color: '#e11d48' },
  'class x': { icon: '🎓', color: '#10b981' },
  'class xi': { icon: '🏛️', color: '#6366f1' },
  'class xii': { icon: '👑', color: '#e11d48' },
  'x a ai': { icon: '🤖', color: '#6366f1' },
  'x b ai': { icon: '🧠', color: '#8b5cf6' },
  'xi ai': { icon: '🤖', color: '#a855f7' },
  'xi cs': { icon: '💻', color: '#2563eb' },
  'xii ai': { icon: '👑', color: '#e11d48' },
  'xii cs': { icon: '💻', color: '#0284c7' },
  default: { icon: '🎒', color: '#38bdf8' },
};

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

interface TechClassMatcher {
  name: string;
  gradeLevel: string;
  subjectName: string;
  classIcon: string;
  classColor: string;
  subjectIcon: string;
  subjectColor: string;
  regex: RegExp;
}

const TECH_CLASS_MATCHERS: TechClassMatcher[] = [
  {
    name: 'X A AI',
    gradeLevel: 'Grade 10 (Class X)',
    subjectName: 'Artificial Intelligence',
    classIcon: '🤖',
    classColor: '#6366f1',
    subjectIcon: '🤖',
    subjectColor: '#6366f1',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:X\s*[\-_\s]*A\s*[\-_\s]*AI|10\s*[\-_\s]*A\s*[\-_\s]*AI)(?:\]|\))?/i,
  },
  {
    name: 'X B AI',
    gradeLevel: 'Grade 10 (Class X)',
    subjectName: 'Artificial Intelligence',
    classIcon: '🧠',
    classColor: '#8b5cf6',
    subjectIcon: '🧠',
    subjectColor: '#8b5cf6',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:X\s*[\-_\s]*B\s*[\-_\s]*AI|10\s*[\-_\s]*B\s*[\-_\s]*AI)(?:\]|\))?/i,
  },
  {
    name: 'XI AI',
    gradeLevel: 'Grade 11 (Class XI)',
    subjectName: 'Artificial Intelligence',
    classIcon: '🤖',
    classColor: '#a855f7',
    subjectIcon: '🤖',
    subjectColor: '#a855f7',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:XI\s*[\-_\s]*AI|11\s*[\-_\s]*AI)(?:\]|\))?/i,
  },
  {
    name: 'XI CS',
    gradeLevel: 'Grade 11 (Class XI)',
    subjectName: 'Computer Science',
    classIcon: '💻',
    classColor: '#2563eb',
    subjectIcon: '💻',
    subjectColor: '#2563eb',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:XI\s*[\-_\s]*CS|11\s*[\-_\s]*CS)(?:\]|\))?/i,
  },
  {
    name: 'XII AI',
    gradeLevel: 'Grade 12 (Class XII)',
    subjectName: 'Artificial Intelligence',
    classIcon: '👑',
    classColor: '#e11d48',
    subjectIcon: '🤖',
    subjectColor: '#e11d48',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:XII\s*[\-_\s]*AI|12\s*[\-_\s]*AI)(?:\]|\))?/i,
  },
  {
    name: 'XII CS',
    gradeLevel: 'Grade 12 (Class XII)',
    subjectName: 'Computer Science',
    classIcon: '💻',
    classColor: '#0284c7',
    subjectIcon: '💻',
    subjectColor: '#0284c7',
    regex: /(?:\[|\()?(?:(?:Class|Grade)\s*)?(?:XII\s*[\-_\s]*CS|12\s*[\-_\s]*CS)(?:\]|\))?/i,
  },
];

export function parseFileInfo(fileName: string): ParsedFileInfo {
  const dotIndex = fileName.lastIndexOf('.');
  const rawBase = (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).trim();

  let className: string | null = null;
  let gradeLevel = 'Grade 1';
  let subjectName: string | null = null;
  let subjectIcon = '📚';
  let subjectColor = '#38bdf8';
  let classIcon = '🎒';
  let classColor = '#38bdf8';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  let remaining = rawBase;

  // 1. First check high-priority standard Tech Class matchers:
  // (X A AI, X B AI, XI AI, XI CS, XII AI, XII CS)
  for (const matcher of TECH_CLASS_MATCHERS) {
    const match = remaining.match(matcher.regex);
    if (match) {
      className = matcher.name;
      gradeLevel = matcher.gradeLevel;
      subjectName = matcher.subjectName;
      classIcon = matcher.classIcon;
      classColor = matcher.classColor;
      subjectIcon = matcher.subjectIcon;
      subjectColor = matcher.subjectColor;
      confidence = 'high';

      // Remove the matched class segment from remaining text
      remaining = remaining.replace(matcher.regex, ' ').trim();
      break;
    }
  }

  // 2. Fallback to generic class pattern if not a standard tech class
  if (!className) {
    const genericClassRegex = /(?:\[|\()?(Grade\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Class\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Kindergarten|Pre-?K|Nursery|LKG|UKG|(?:1[0-2]|[1-9])(?:st|nd|rd|th)\s*Grade|G(?:1[0-2]|[1-9]))(?:\]|\))?/i;
    const genericMatch = remaining.match(genericClassRegex);

    if (genericMatch) {
      confidence = 'high';
      let matchedStr = genericMatch[1].trim();

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

      const gradeKey = className.toLowerCase();
      const style = GRADE_DEFAULTS[gradeKey] || GRADE_DEFAULTS.default;
      classIcon = style.icon;
      classColor = style.color;

      remaining = remaining.replace(genericMatch[0], ' ').trim();
    }
  }

  // 3. Clean remaining string and split into parts
  const sanitized = remaining
    .replace(/\[([^\]]+)\]/g, ' - $1 - ')
    .replace(/\(([^\)]+)\)/g, ' - $1 - ');

  const parts = sanitized
    .split(/\s*[-_|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  // 4. Identify Subject from parts if not already determined
  if (!subjectName) {
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
  }

  // 5. Identify and group Unit as per unit name of file
  // Examples:
  // "Unit 1 Introduction to AI" -> "Unit 1: Introduction to AI"
  // "Unit 2 Python Functions"   -> "Unit 2: Python Functions"
  // "Chapter 3 Neural Networks" -> "Chapter 3: Neural Networks"
  // "Unit 1" + "Python Basics"  -> "Unit 1: Python Basics"
  let unitName: string | null = null;
  let unitPartIndex = -1;

  // Dedicated regex matching Unit, Chapter, Topic, Module, Lesson
  const unitMatcher = /^(Unit|Chapter|Topic|Module|Lesson)\s*(\d+)(?:[:\s\-_–]+(.*))?$/i;

  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(unitMatcher);
    if (match) {
      unitPartIndex = i;
      const prefixType = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const unitNum = match[2];
      const inlineTopic = (match[3] || '').trim();

      if (inlineTopic) {
        // e.g. "Unit 1 Introduction to AI"
        const cleanTopic = inlineTopic.replace(/^[:\-_–\s]+/, '').trim();
        unitName = `${prefixType} ${unitNum}: ${cleanTopic}`;
      } else if (i + 1 < parts.length && parts.length > 2) {
        // If part is just "Unit 1" and there is a subsequent descriptive topic part
        const nextPart = parts[i + 1];
        // Ensure next part is not another unit or purely file extension
        if (!unitMatcher.test(nextPart) && nextPart.length > 1) {
          unitName = `${prefixType} ${unitNum}: ${nextPart}`;
          unitPartIndex = i + 1; // Mark both parts as consumed for unit
        } else {
          unitName = `${prefixType} ${unitNum}`;
        }
      } else {
        unitName = `${prefixType} ${unitNum}`;
      }
      break;
    }
  }

  // 6. Determine Resource Title
  // The title should be the descriptive part not consumed by Class, Subject, or Unit
  let title = '';

  const nonUnitParts = parts.filter((p, idx) => {
    if (unitPartIndex !== -1 && (idx === unitPartIndex || (idx === unitPartIndex - 1 && parts[idx].match(unitMatcher)))) {
      return false;
    }
    // Also ignore parts that are identical to the subject name
    if (subjectName && p.toLowerCase() === subjectName.toLowerCase()) {
      return false;
    }
    return true;
  });

  if (nonUnitParts.length > 0) {
    title = nonUnitParts[nonUnitParts.length - 1];
  } else if (parts.length > 0) {
    title = parts[parts.length - 1];
  } else {
    title = rawBase;
  }

  // Clean title formatting
  title = title
    .replace(/^[-_\s:]+/, '')
    .replace(/[-_\s:]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // If no unit was extracted, assign default unit based on subject or generic
  if (!unitName) {
    unitName = subjectName ? `Unit 1: Introduction to ${subjectName}` : 'Unit 1: General Learning';
  }

  return {
    fileName,
    className,
    gradeLevel,
    classIcon,
    classColor,
    subjectName,
    subjectIcon,
    subjectColor,
    unitName,
    title: title || 'Learning Resource',
    confidence,
  };
}
