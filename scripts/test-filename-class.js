const COMMON_SUBJECTS = {
  science: { icon: '🧪', color: '#10b981' },
  physics: { icon: '⚡', color: '#6366f1' },
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
  kindergarten: { icon: '🧸', color: '#fb923c' },
  'grade 1': { icon: '🎒', color: '#38bdf8' },
  'grade 2': { icon: '🚀', color: '#a855f7' },
  'grade 3': { icon: '🌟', color: '#facc15' },
  'grade 4': { icon: '🦁', color: '#4ade80' },
  'grade 5': { icon: '🔬', color: '#ec4899' },
  default: { icon: '🎒', color: '#38bdf8' },
};

function parseFileInfo(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const rawBase = (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).trim();

  const classRegex = /(?:\[|\()?(Grade\s*\d+|Class\s*\d+|Kindergarten|Pre-?K|[1-5](?:st|nd|rd|th)\s*Grade|G[1-5])(?:\]|\))?/i;
  const classMatch = rawBase.match(classRegex);

  let className = null;
  let gradeLevel = 'Grade 1';

  if (classMatch) {
    let matchedStr = classMatch[1].trim();

    if (/^G(\d)$/i.test(matchedStr)) {
      matchedStr = `Grade ${matchedStr.slice(1)}`;
    } else if (/^K$/i.test(matchedStr)) {
      matchedStr = 'Kindergarten';
    } else if (/^([1-5])(?:st|nd|rd|th)\s*Grade$/i.test(matchedStr)) {
      const num = matchedStr.match(/\d/)?.[0] || '1';
      matchedStr = `Grade ${num}`;
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
    unitName: unitName || (subjectName ? `Unit 1: Introduction to ${subjectName}` : 'Unit 1: General Learning'),
    title: title || 'Learning Resource',
  };
}

console.log('--- TESTING FILENAME TO CLASS/HIERARCHY PARSER ---');

const testCases = [
  'Grade 1 - Science - Solar System.pdf',
  'Grade 2_Math_Fractions.pdf',
  '[Grade 3] English - Reading Comprehension.docx',
  'Class 4 - History - Ancient Rome.pdf',
  'Kindergarten - Phonics Letter A.mp4',
  'G5 - Coding - Intro to Loops.html',
  'Pre-K - Art - Finger Painting.png',
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

console.log('\n--- ALL FILENAME PARSER TESTS PASSED ---');
