const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'portal.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_FILE);

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade_level TEXT,
    icon TEXT DEFAULT '🎒',
    color TEXT DEFAULT '#38bdf8',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
    password_hash TEXT,
    pin TEXT,
    avatar TEXT DEFAULT '🦊',
    stars INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color_code TEXT DEFAULT '#38bdf8',
    icon TEXT DEFAULT '📚',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS access_logs (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    resource_title TEXT NOT NULL,
    class_name TEXT,
    subject_name TEXT,
    unit_name TEXT,
    action_type TEXT NOT NULL CHECK(action_type IN ('view', 'download', 'interact', 'complete')),
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const teacherEmail = (process.env.DEFAULT_TEACHER_EMAIL || 'teacher@school.edu').toLowerCase();
const teacherPassword = process.env.DEFAULT_TEACHER_PASSWORD || 'teacher123';
const teacherName = process.env.DEFAULT_TEACHER_NAME || 'Ms. Harper';

const existingTeacher = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(teacherEmail);

if (existingTeacher) {
  console.log(`\nDefault Teacher account already exists:`);
  console.log(`   Email:    ${teacherEmail}`);
  console.log(`   Role:     Teacher`);
  console.log(`   Status:   Ready to log in!\n`);
} else {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(teacherPassword, salt);
  const teacherId = 'teacher_' + Math.random().toString(36).substring(2, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, role, password_hash, avatar)
    VALUES (?, ?, ?, 'teacher', ?, '👩‍🏫')
  `).run(teacherId, teacherName, teacherEmail, passwordHash);

  console.log(`\nDefault Teacher Account Successfully Created!`);
  console.log(`   Name:     ${teacherName}`);
  console.log(`   Email:    ${teacherEmail}`);
  console.log(`   Password: ${teacherPassword}`);
  console.log(`   Avatar:   👩‍🏫`);
  console.log(`   Note:     Zero dummy content created as requested. Ready for real classroom setup.\n`);
}
