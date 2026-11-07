const COMMON_SUBJECTS = {
  science: { icon: '🧪', color: '#10b981' },
  physics: { icon: '⚡', color: '#6366f1' },
  chemistry: { icon: '🧪', color: '#06b6d4' },
  biology: { icon: '🌱', color: '#22c55e' },
  math: { icon: '📐', color: '#38bdf8' },
  reading: { icon: '📖', color: '#f59e0b' },
  english: { icon: '📝', color: '#f59e0b' },
  art: { icon: '🎨', color: '#ec4899' },
  music: { icon: '🎵', color: '#a855f7' },
  history: { icon: '🏛️', color: '#8b5cf6' },
  coding: { icon: '💻', color: '#2563eb' },
};

const GRADE_DEFAULTS = {
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
  default: { icon: '🎒', color: '#38bdf8' },
};

const ROMAN_NUMERALS = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
  vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
};

function parseFileInfo(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const rawBase = (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).trim();

  // 1. Detect Class pattern (e.g. "Grade 1" to "Grade 12", "Class XII", "Kindergarten", "G12", "10th Grade")
  const classRegex = /(?:\[|\()?(Grade\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Class\s*(?:1[0-2]|[1-9]|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)|Kindergarten|Pre-?K|Nursery|LKG|UKG|(?:1[0-2]|[1-9])(?:st|nd|rd|th)\s*Grade|G(?:1[0-2]|[1-9]))(?:\]|\))?/i;
  const classMatch = rawBase.match(classRegex);

  let className = null;
  let gradeLevel = 'Grade 1';

  if (classMatch) {
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

  const sanitized = rawBase
    .replace(/\[([^\]]+)\]/g, ' - $1 - ')
    .replace(/\(([^\)]+)\)/g, ' - $1 - ');

  const parts = sanitized
    .split(/\s*[-_|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let subjectName = null;
  let subjectIcon = '📚';
  let unitName = null;
  let title = rawBase;

  for (const part of parts) {
    const lower = part.toLowerCase();
    for (const [key, val] of Object.entries(COMMON_SUBJECTS)) {
      if (lower === key || lower.startsWith(key) || lower.endsWith(key)) {
        subjectName = part.charAt(0).toUpperCase() + part.slice(1);
        subjectIcon = val.icon;
        break;
      }
    }
    if (subjectName) break;
  }

  const unitPart = parts.find((p) => /^(Unit|Chapter|Topic|Module|Lesson)\s*\d*/i.test(p));
  if (unitPart) {
    unitName = unitPart;
  } else if (parts.length >= 3 && !unitName) {
    unitName = parts[2];
  }

  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (!classRegex.test(lastPart)) {
      title = lastPart;
    } else {
      title = parts[0];
    }
  }

  title = title.replace(/[-_]/g, ' ').trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  const gradeKey = (className || 'default').toLowerCase().split('(')[0].trim();
  const classStyle = GRADE_DEFAULTS[gradeKey] || GRADE_DEFAULTS.default;

  return {
    fileName,
    className,
    gradeLevel,
    classIcon: classStyle.icon,
    classColor: classStyle.color,
    subjectName,
    subjectIcon,
    unitName: unitName || (subjectName ? `Unit 1: Introduction to ${subjectName}` : 'Unit 1: General Learning'),
    title: title || 'Learning Resource',
  };
}

console.log('--- TESTING FILENAME TO CLASS/HIERARCHY PARSER (UP TO GRADE 12 / CLASS XII) ---');

const testCases = [
  'Grade 1 - Science - Solar System.pdf',
  'Grade 2_Math_Fractions.pdf',
  '[Grade 3] English - Reading Comprehension.docx',
  'Class 4 - History - Ancient Rome.pdf',
  'Kindergarten - Phonics Letter A.mp4',
  'G5 - Coding - Intro to Loops.html',
  'Pre-K - Art - Finger Painting.png',
  'Grade 10 - Biology - Cell Division.pdf',
  'Class XII - Physics - Quantum Mechanics.pdf',
  'Class 11 - Chemistry - Organic Reactions.docx',
  '[Grade 9] History - World Wars.pdf',
  'G12 - Coding - Advanced Algorithms.html',
  'Simple_Notes.pdf'
];

testCases.forEach((name) => {
  const parsed = parseFileInfo(name);
  console.log(`\nFile: "${name}"`);
  console.log(`   -> Class:   "${parsed.className}" [Grade: ${parsed.gradeLevel}, Icon: ${parsed.classIcon}, Color: ${parsed.classColor}]`);
  console.log(`   -> Subject: "${parsed.subjectName}" [Icon: ${parsed.subjectIcon}]`);
  console.log(`   -> Unit:    "${parsed.unitName}"`);
  console.log(`   -> Title:   "${parsed.title}"`);
});

console.log('\n--- ALL EXTENDED FILENAME PARSER TESTS PASSED (UP TO GRADE 12 / XII) ---');
