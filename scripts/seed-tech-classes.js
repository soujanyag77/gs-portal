const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'portal.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbFile);

const classes = [
  {
    name: 'X A AI',
    grade_level: 'Grade 10 (Class X)',
    icon: '🤖',
    color: '#6366f1',
    subject: 'Artificial Intelligence',
    sub_icon: '🤖',
    sub_color: '#6366f1',
  },
  {
    name: 'X B AI',
    grade_level: 'Grade 10 (Class X)',
    icon: '🧠',
    color: '#8b5cf6',
    subject: 'Artificial Intelligence',
    sub_icon: '🧠',
    sub_color: '#8b5cf6',
  },
  {
    name: 'XI AI',
    grade_level: 'Grade 11 (Class XI)',
    icon: '🤖',
    color: '#a855f7',
    subject: 'Artificial Intelligence',
    sub_icon: '🤖',
    sub_color: '#a855f7',
  },
  {
    name: 'XI CS',
    grade_level: 'Grade 11 (Class XI)',
    icon: '💻',
    color: '#2563eb',
    subject: 'Computer Science',
    sub_icon: '💻',
    sub_color: '#2563eb',
  },
  {
    name: 'XII AI',
    grade_level: 'Grade 12 (Class XII)',
    icon: '👑',
    color: '#e11d48',
    subject: 'Artificial Intelligence',
    sub_icon: '🤖',
    sub_color: '#e11d48',
  },
  {
    name: 'XII CS',
    grade_level: 'Grade 12 (Class XII)',
    icon: '💻',
    color: '#0284c7',
    subject: 'Computer Science',
    sub_icon: '💻',
    sub_color: '#0284c7',
  },
];

console.log('Seeding standard tech classes into SQLite:');

for (const c of classes) {
  let existing = db.prepare('SELECT id FROM classes WHERE LOWER(name) = LOWER(?)').get(c.name);
  let classId = existing ? existing.id : 'class_' + Math.random().toString(36).substring(2, 10);
  
  if (!existing) {
    db.prepare('INSERT INTO classes (id, name, grade_level, icon, color) VALUES (?, ?, ?, ?, ?)').run(
      classId,
      c.name,
      c.grade_level,
      c.icon,
      c.color
    );
    console.log(` Created class: ${c.name} (${classId})`);
  } else {
    console.log(` Existing class: ${c.name} (${classId})`);
  }

  let existingSubj = db.prepare('SELECT id FROM subjects WHERE class_id = ? AND LOWER(name) = LOWER(?)').get(classId, c.subject);
  if (!existingSubj) {
    const subjId = 'subj_' + Math.random().toString(36).substring(2, 10);
    db.prepare('INSERT INTO subjects (id, class_id, name, color_code, icon) VALUES (?, ?, ?, ?, ?)').run(
      subjId,
      classId,
      c.subject,
      c.sub_color,
      c.sub_icon
    );
    console.log(`   + Subject: ${c.subject} (${subjId})`);
  } else {
    console.log(`   = Subject: ${c.subject} exists`);
  }
}

console.log('Finished seeding tech classes.');
