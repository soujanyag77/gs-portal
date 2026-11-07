import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import {
  User,
  ClassItem,
  SubjectItem,
  UnitItem,
  ResourceItem,
  AccessLogItem,
  AnalyticsSummary,
  FileType,
  ActionType,
} from './types';

import os from 'os';

// Detect serverless environment (Vercel / AWS Lambda) where process.cwd() is read-only
const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'portal_data') : path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'portal.db');

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    // Graceful fallback for read-only filesystem environments
    console.warn('Notice: Local storage directory initialization skipped on read-only system:', err);
  }
}

// Global DB instance singleton
let dbInstance: any = null;

function createSafeDbFallback() {
  return {
    exec: () => {},
    prepare: () => ({
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
  };
}

export function getDb(): any {
  if (!dbInstance) {
    ensureDirectories();
    try {
      const { DatabaseSync } = require('node:sqlite');
      dbInstance = new DatabaseSync(DB_FILE);
      dbInstance.exec('PRAGMA foreign_keys = ON;');
      initSchema(dbInstance);
    } catch (err) {
      console.warn('Local SQLite not available on this runtime, using safe fallback:', err);
      return createSafeDbFallback();
    }
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
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
}

// ---------------- USER OPERATIONS ----------------

export function getUserByEmail(email: string): (User & { password_hash: string }) | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.*, c.name as class_name 
       FROM users u 
       LEFT JOIN classes c ON u.class_id = c.id 
       WHERE LOWER(u.email) = LOWER(?)`
    )
    .get(email);
  return (row as any) || null;
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.class_id, u.avatar, u.stars, u.created_at, c.name as class_name 
       FROM users u 
       LEFT JOIN classes c ON u.class_id = c.id 
       WHERE u.id = ?`
    )
    .get(id);
  return (row as any) || null;
}

export function getStudentByNameAndClass(name: string, classId: string): (User & { pin?: string }) | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.*, c.name as class_name 
       FROM users u 
       LEFT JOIN classes c ON u.class_id = c.id 
       WHERE LOWER(TRIM(u.name)) = LOWER(TRIM(?)) AND u.class_id = ? AND u.role = 'student'`
    )
    .get(name, classId);
  return (row as any) || null;
}

export function listStudentsByClass(classId?: string): User[] {
  const db = getDb();
  if (classId) {
    const rows = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.class_id, u.avatar, u.stars, u.pin, u.created_at, c.name as class_name 
         FROM users u 
         LEFT JOIN classes c ON u.class_id = c.id 
         WHERE u.role = 'student' AND u.class_id = ? 
         ORDER BY u.name ASC`
      )
      .all(classId);
    return rows as any;
  }
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.class_id, u.avatar, u.stars, u.pin, u.created_at, c.name as class_name 
       FROM users u 
       LEFT JOIN classes c ON u.class_id = c.id 
       WHERE u.role = 'student' 
       ORDER BY u.name ASC`
    )
    .all();
  return rows as any;
}

export function createUser(user: {
  id: string;
  name: string;
  email?: string | null;
  role: 'teacher' | 'student';
  class_id?: string | null;
  password_hash?: string | null;
  pin?: string | null;
  avatar?: string;
  stars?: number;
}): User {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, name, email, role, class_id, password_hash, pin, avatar, stars) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    user.name,
    user.email || null,
    user.role,
    user.class_id || null,
    user.password_hash || null,
    user.pin || null,
    user.avatar || (user.role === 'teacher' ? '👩‍🏫' : '🦊'),
    user.stars || 0
  );
  return getUserById(user.id)!;
}

export function deleteStudent(studentId: string): boolean {
  const db = getDb();
  const res = db.prepare(`DELETE FROM users WHERE id = ? AND role = 'student'`).run(studentId);
  return res.changes > 0;
}

// ---------------- CLASS OPERATIONS ----------------

export function listClasses(): ClassItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM subjects s WHERE s.class_id = c.id) as subject_count,
              (SELECT COUNT(*) FROM users u WHERE u.class_id = c.id AND u.role = 'student') as student_count,
              (SELECT COUNT(*) FROM resources r 
               JOIN units un ON r.unit_id = un.id 
               JOIN subjects s ON un.subject_id = s.id 
               WHERE s.class_id = c.id) as resource_count
       FROM classes c 
       ORDER BY c.name ASC`
    )
    .all();
  return rows as any;
}

export function getClassById(id: string): ClassItem | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM classes WHERE id = ?`).get(id);
  return (row as any) || null;
}

export function createClass(cls: {
  id: string;
  name: string;
  grade_level?: string;
  icon?: string;
  color?: string;
}): ClassItem {
  const db = getDb();
  db.prepare(
    `INSERT INTO classes (id, name, grade_level, icon, color) VALUES (?, ?, ?, ?, ?)`
  ).run(
    cls.id,
    cls.name,
    cls.grade_level || 'Grade 1',
    cls.icon || '🎒',
    cls.color || '#38bdf8'
  );
  return getClassById(cls.id)!;
}

export function updateClass(
  id: string,
  cls: { name?: string; grade_level?: string; icon?: string; color?: string }
): ClassItem | null {
  const db = getDb();
  const current = getClassById(id);
  if (!current) return null;

  db.prepare(
    `UPDATE classes SET 
       name = COALESCE(?, name), 
       grade_level = COALESCE(?, grade_level), 
       icon = COALESCE(?, icon), 
       color = COALESCE(?, color) 
     WHERE id = ?`
  ).run(cls.name || null, cls.grade_level || null, cls.icon || null, cls.color || null, id);
  return getClassById(id);
}

export function deleteClass(id: string): boolean {
  const db = getDb();
  try {
    // Disable foreign keys temporarily during multi-table cascading to guarantee
    // safe deletion without any FOREIGN KEY constraint failed errors
    db.exec('PRAGMA foreign_keys = OFF;');

    // 1. Unassign any students from this class
    try {
      db.prepare(`UPDATE users SET class_id = NULL WHERE class_id = ?`).run(id);
    } catch (e) {
      // ignore
    }

    // 2. Find all subjects belonging to this class
    const subjects: any[] = db.prepare(`SELECT id FROM subjects WHERE class_id = ?`).all(id);
    const subjectIds = subjects.map((s) => s.id);

    if (subjectIds.length > 0) {
      const subjPlaceholders = subjectIds.map(() => '?').join(',');
      const units: any[] = db
        .prepare(`SELECT id FROM units WHERE subject_id IN (${subjPlaceholders})`)
        .all(...subjectIds);
      const unitIds = units.map((u) => u.id);

      if (unitIds.length > 0) {
        const unitPlaceholders = unitIds.map(() => '?').join(',');
        const resources: any[] = db
          .prepare(`SELECT id FROM resources WHERE unit_id IN (${unitPlaceholders})`)
          .all(...unitIds);
        const resourceIds = resources.map((r) => r.id);

        if (resourceIds.length > 0) {
          const resPlaceholders = resourceIds.map(() => '?').join(',');
          try {
            db.prepare(`DELETE FROM access_logs WHERE resource_id IN (${resPlaceholders})`).run(...resourceIds);
          } catch (e) {}
          try {
            db.prepare(`DELETE FROM resources WHERE id IN (${resPlaceholders})`).run(...resourceIds);
          } catch (e) {}
        }
        try {
          db.prepare(`DELETE FROM units WHERE id IN (${unitPlaceholders})`).run(...unitIds);
        } catch (e) {}
      }
      try {
        db.prepare(`DELETE FROM subjects WHERE id IN (${subjPlaceholders})`).run(...subjectIds);
      } catch (e) {}
    }

    // 3. Delete the class itself
    const res = db.prepare(`DELETE FROM classes WHERE id = ?`).run(id);
    db.exec('PRAGMA foreign_keys = ON;');
    return res.changes > 0;
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('Error in safe deleteClass:', err);
    throw err;
  }
}

// ---------------- SUBJECT OPERATIONS ----------------

export function listSubjects(classId?: string): SubjectItem[] {
  const db = getDb();
  if (classId) {
    const rows = db
      .prepare(
        `SELECT s.*, 
                (SELECT COUNT(*) FROM units u WHERE u.subject_id = s.id) as unit_count,
                (SELECT COUNT(*) FROM resources r 
                 JOIN units u ON r.unit_id = u.id 
                 WHERE u.subject_id = s.id) as resource_count
         FROM subjects s 
         WHERE s.class_id = ? 
         ORDER BY s.name ASC`
      )
      .all(classId);
    return rows as any;
  }
  const rows = db
    .prepare(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM units u WHERE u.subject_id = s.id) as unit_count,
              (SELECT COUNT(*) FROM resources r 
               JOIN units u ON r.unit_id = u.id 
               WHERE u.subject_id = s.id) as resource_count
       FROM subjects s 
       ORDER BY s.name ASC`
    )
    .all();
  return rows as any;
}

export function getSubjectById(id: string): SubjectItem | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(id);
  return (row as any) || null;
}

export function createSubject(subj: {
  id: string;
  class_id: string;
  name: string;
  color_code?: string;
  icon?: string;
}): SubjectItem {
  const db = getDb();
  db.prepare(
    `INSERT INTO subjects (id, class_id, name, color_code, icon) VALUES (?, ?, ?, ?, ?)`
  ).run(subj.id, subj.class_id, subj.name, subj.color_code || '#38bdf8', subj.icon || '📚');
  return getSubjectById(subj.id)!;
}

export function updateSubject(
  id: string,
  subj: { name?: string; color_code?: string; icon?: string }
): SubjectItem | null {
  const db = getDb();
  db.prepare(
    `UPDATE subjects SET 
       name = COALESCE(?, name), 
       color_code = COALESCE(?, color_code), 
       icon = COALESCE(?, icon) 
     WHERE id = ?`
  ).run(subj.name || null, subj.color_code || null, subj.icon || null, id);
  return getSubjectById(id);
}

export function deleteSubject(id: string): boolean {
  const db = getDb();
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    const units: any[] = db.prepare(`SELECT id FROM units WHERE subject_id = ?`).all(id);
    const unitIds = units.map((u) => u.id);
    if (unitIds.length > 0) {
      const unitPlaceholders = unitIds.map(() => '?').join(',');
      const resources: any[] = db
        .prepare(`SELECT id FROM resources WHERE unit_id IN (${unitPlaceholders})`)
        .all(...unitIds);
      const resourceIds = resources.map((r) => r.id);
      if (resourceIds.length > 0) {
        const resPlaceholders = resourceIds.map(() => '?').join(',');
        try {
          db.prepare(`DELETE FROM access_logs WHERE resource_id IN (${resPlaceholders})`).run(...resourceIds);
        } catch (e) {}
        try {
          db.prepare(`DELETE FROM resources WHERE id IN (${resPlaceholders})`).run(...resourceIds);
        } catch (e) {}
      }
      try {
        db.prepare(`DELETE FROM units WHERE id IN (${unitPlaceholders})`).run(...unitIds);
      } catch (e) {}
    }
    const res = db.prepare(`DELETE FROM subjects WHERE id = ?`).run(id);
    db.exec('PRAGMA foreign_keys = ON;');
    return res.changes > 0;
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('Error in safe deleteSubject:', err);
    throw err;
  }
}

// ---------------- UNIT OPERATIONS ----------------

export function listUnits(subjectId?: string): UnitItem[] {
  const db = getDb();
  if (subjectId) {
    const rows = db
      .prepare(
        `SELECT u.*, 
                (SELECT COUNT(*) FROM resources r WHERE r.unit_id = u.id) as resource_count
         FROM units u 
         WHERE u.subject_id = ? 
         ORDER BY u.order_index ASC, u.name ASC`
      )
      .all(subjectId);
    return rows as any;
  }
  const rows = db
    .prepare(
      `SELECT u.*, 
              (SELECT COUNT(*) FROM resources r WHERE r.unit_id = u.id) as resource_count
       FROM units u 
       ORDER BY u.order_index ASC, u.name ASC`
    )
    .all();
  return rows as any;
}

export function getUnitById(id: string): UnitItem | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM units WHERE id = ?`).get(id);
  return (row as any) || null;
}

export function createUnit(unit: {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  order_index?: number;
}): UnitItem {
  const db = getDb();
  db.prepare(
    `INSERT INTO units (id, subject_id, name, description, order_index) VALUES (?, ?, ?, ?, ?)`
  ).run(unit.id, unit.subject_id, unit.name, unit.description || '', unit.order_index || 0);
  return getUnitById(unit.id)!;
}

export function updateUnit(
  id: string,
  unit: { name?: string; description?: string; order_index?: number }
): UnitItem | null {
  const db = getDb();
  db.prepare(
    `UPDATE units SET 
       name = COALESCE(?, name), 
       description = COALESCE(?, description), 
       order_index = COALESCE(?, order_index) 
     WHERE id = ?`
  ).run(unit.name || null, unit.description !== undefined ? unit.description : null, unit.order_index ?? null, id);
  return getUnitById(id);
}

export function deleteUnit(id: string): boolean {
  const db = getDb();
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    const resources: any[] = db.prepare(`SELECT id FROM resources WHERE unit_id = ?`).all(id);
    const resourceIds = resources.map((r) => r.id);
    if (resourceIds.length > 0) {
      const resPlaceholders = resourceIds.map(() => '?').join(',');
      try {
        db.prepare(`DELETE FROM access_logs WHERE resource_id IN (${resPlaceholders})`).run(...resourceIds);
      } catch (e) {}
      try {
        db.prepare(`DELETE FROM resources WHERE id IN (${resPlaceholders})`).run(...resourceIds);
      } catch (e) {}
    }
    const res = db.prepare(`DELETE FROM units WHERE id = ?`).run(id);
    db.exec('PRAGMA foreign_keys = ON;');
    return res.changes > 0;
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('Error in safe deleteUnit:', err);
    throw err;
  }
}

// ---------------- RESOURCE OPERATIONS ----------------

export function listResources(filters?: {
  class_id?: string;
  subject_id?: string;
  unit_id?: string;
  file_type?: string;
  search?: string;
}): ResourceItem[] {
  const db = getDb();
  let query = `
    SELECT r.*, 
           u.name as unit_name, 
           s.id as subject_id, 
           s.name as subject_name, 
           c.id as class_id, 
           c.name as class_name 
    FROM resources r 
    JOIN units u ON r.unit_id = u.id 
    JOIN subjects s ON u.subject_id = s.id 
    JOIN classes c ON s.class_id = c.id 
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.class_id) {
    query += ` AND c.id = ?`;
    params.push(filters.class_id);
  }
  if (filters?.subject_id) {
    query += ` AND s.id = ?`;
    params.push(filters.subject_id);
  }
  if (filters?.unit_id) {
    query += ` AND u.id = ?`;
    params.push(filters.unit_id);
  }
  if (filters?.file_type && filters.file_type !== 'all') {
    query += ` AND r.file_type = ?`;
    params.push(filters.file_type);
  }
  if (filters?.search) {
    query += ` AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.file_name) LIKE ?)`;
    const searchParam = `%${filters.search.toLowerCase()}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ` ORDER BY r.created_at DESC`;
  const rows = db.prepare(query).all(...params);
  return rows as any;
}

export function getResourceById(id: string): ResourceItem | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT r.*, 
              u.name as unit_name, 
              s.id as subject_id, 
              s.name as subject_name, 
              c.id as class_id, 
              c.name as class_name 
       FROM resources r 
       JOIN units u ON r.unit_id = u.id 
       JOIN subjects s ON u.subject_id = s.id 
       JOIN classes c ON s.class_id = c.id 
       WHERE r.id = ?`
    )
    .get(id);
  return (row as any) || null;
}

export function createResource(res: {
  id: string;
  unit_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_type: FileType;
  file_size?: number;
  mime_type?: string;
}): ResourceItem {
  const db = getDb();
  db.prepare(
    `INSERT INTO resources (id, unit_id, title, description, file_url, file_name, file_type, file_size, mime_type) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    res.id,
    res.unit_id,
    res.title,
    res.description || '',
    res.file_url,
    res.file_name,
    res.file_type,
    res.file_size || 0,
    res.mime_type || ''
  );
  return getResourceById(res.id)!;
}

export function updateResource(
  id: string,
  res: {
    title?: string;
    description?: string;
    unit_id?: string;
    file_url?: string;
    file_name?: string;
    file_type?: FileType;
    file_size?: number;
    mime_type?: string;
  }
): ResourceItem | null {
  const db = getDb();
  const current = getResourceById(id);
  if (!current) return null;

  db.prepare(
    `UPDATE resources SET 
       title = COALESCE(?, title), 
       description = COALESCE(?, description), 
       unit_id = COALESCE(?, unit_id), 
       file_url = COALESCE(?, file_url), 
       file_name = COALESCE(?, file_name), 
       file_type = COALESCE(?, file_type), 
       file_size = COALESCE(?, file_size), 
       mime_type = COALESCE(?, mime_type) 
     WHERE id = ?`
  ).run(
    res.title || null,
    res.description !== undefined ? res.description : null,
    res.unit_id || null,
    res.file_url || null,
    res.file_name || null,
    res.file_type || null,
    res.file_size !== undefined ? res.file_size : null,
    res.mime_type || null,
    id
  );
  return getResourceById(id);
}

export function deleteResource(id: string): boolean {
  const db = getDb();
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    try {
      db.prepare(`DELETE FROM access_logs WHERE resource_id = ?`).run(id);
    } catch (e) {}
    const res = db.prepare(`DELETE FROM resources WHERE id = ?`).run(id);
    db.exec('PRAGMA foreign_keys = ON;');
    return res.changes > 0;
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('Error in safe deleteResource:', err);
    throw err;
  }
}

export function incrementResourceStat(id: string, type: 'view' | 'download') {
  const db = getDb();
  if (type === 'view') {
    db.prepare(`UPDATE resources SET view_count = view_count + 1 WHERE id = ?`).run(id);
  } else {
    db.prepare(`UPDATE resources SET download_count = download_count + 1 WHERE id = ?`).run(id);
  }
}

// ---------------- ACCESS / ACTIVITY LOGS ----------------

export function logActivity(log: {
  id: string;
  student_id: string;
  student_name: string;
  resource_id: string;
  resource_title: string;
  class_name?: string;
  subject_name?: string;
  unit_name?: string;
  action_type: ActionType;
}): AccessLogItem {
  const db = getDb();

  // Audit logs must never fail due to foreign key constraints,
  // even for preview teacher, guest students, or Supabase resources.
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.prepare(
      `INSERT INTO access_logs (id, student_id, student_name, resource_id, resource_title, class_name, subject_name, unit_name, action_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      log.id,
      log.student_id,
      log.student_name,
      log.resource_id,
      log.resource_title,
      log.class_name || '',
      log.subject_name || '',
      log.unit_name || '',
      log.action_type
    );
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.warn('logActivity insertion notice:', err);
  }

  // Award stars to student on interaction/view if student exists in users
  try {
    db.prepare(`UPDATE users SET stars = stars + 1 WHERE id = ? AND role = 'student'`).run(log.student_id);
  } catch (e) {
    // ignore
  }

  try {
    const row = db.prepare(`SELECT * FROM access_logs WHERE id = ?`).get(log.id);
    if (row) return row as any;
  } catch (e) {}

  return {
    id: log.id,
    student_id: log.student_id,
    student_name: log.student_name,
    resource_id: log.resource_id,
    resource_title: log.resource_title,
    action_type: log.action_type,
    accessed_at: new Date().toISOString(),
  };
}

export function getAnalyticsSummary(classId?: string): AnalyticsSummary {
  const db = getDb();

  // Find class name if classId provided
  let className: string | null = null;
  if (classId && classId !== 'all') {
    const cls = getClassById(classId);
    if (cls) className = cls.name;
  }

  // Active students count
  let studentCountQuery = `SELECT COUNT(DISTINCT student_id) as count FROM access_logs WHERE 1=1`;
  const studentCountParams: any[] = [];
  if (className) {
    studentCountQuery += ` AND class_name = ?`;
    studentCountParams.push(className);
  }
  const activeStudentsRow: any = db.prepare(studentCountQuery).get(...studentCountParams);
  const totalActiveStudents = activeStudentsRow ? activeStudentsRow.count : 0;

  // Total materials accessed
  let totalMaterialsQuery = `SELECT COUNT(DISTINCT resource_id) as count FROM access_logs WHERE 1=1`;
  const totalMaterialsParams: any[] = [];
  if (className) {
    totalMaterialsQuery += ` AND class_name = ?`;
    totalMaterialsParams.push(className);
  }
  const totalMaterialsRow: any = db.prepare(totalMaterialsQuery).get(...totalMaterialsParams);
  const totalMaterialsAccessed = totalMaterialsRow ? totalMaterialsRow.count : 0;

  // Total views and downloads this week (last 7 days)
  let viewsQuery = `
    SELECT 
      SUM(CASE WHEN action_type IN ('view', 'interact') THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN action_type = 'download' THEN 1 ELSE 0 END) as downloads
    FROM access_logs 
    WHERE accessed_at >= datetime('now', '-7 days')
  `;
  const viewsParams: any[] = [];
  if (className) {
    viewsQuery += ` AND class_name = ?`;
    viewsParams.push(className);
  }
  const statsRow: any = db.prepare(viewsQuery).get(...viewsParams);
  const totalViewsThisWeek = statsRow?.views || 0;
  const totalDownloadsThisWeek = statsRow?.downloads || 0;

  // Most popular topic
  let popTopicQuery = `
    SELECT unit_name, subject_name, COUNT(*) as count 
    FROM access_logs 
    WHERE unit_name IS NOT NULL AND unit_name != ''
  `;
  const popParams: any[] = [];
  if (className) {
    popTopicQuery += ` AND class_name = ?`;
    popParams.push(className);
  }
  popTopicQuery += ` GROUP BY unit_name, subject_name ORDER BY count DESC LIMIT 1`;
  const popTopicRow: any = db.prepare(popTopicQuery).get(...popParams);

  // Student roster breakdown
  let rosterQuery = `
    SELECT 
      u.id as student_id,
      u.name as student_name,
      u.avatar,
      COALESCE(c.name, 'Unassigned') as class_name,
      COUNT(DISTINCT l.resource_id) as materials_accessed,
      MAX(l.accessed_at) as last_active
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN access_logs l ON u.id = l.student_id
    WHERE u.role = 'student'
  `;
  const rosterParams: any[] = [];
  if (classId && classId !== 'all') {
    rosterQuery += ` AND u.class_id = ?`;
    rosterParams.push(classId);
  }
  rosterQuery += ` GROUP BY u.id ORDER BY materials_accessed DESC, u.name ASC`;
  const rosterRows: any[] = db.prepare(rosterQuery).all(...rosterParams);

  // For each student, get up to 3 recent resources
  const studentRoster = rosterRows.map((r) => {
    const recentResources: any[] = db
      .prepare(
        `SELECT resource_title as title, subject_name as subject, unit_name as unit, action_type, accessed_at 
         FROM access_logs 
         WHERE student_id = ? 
         ORDER BY accessed_at DESC 
         LIMIT 4`
      )
      .all(r.student_id);

    return {
      student_id: r.student_id,
      student_name: r.student_name,
      avatar: r.avatar || '🦊',
      class_name: r.class_name,
      materials_accessed: r.materials_accessed || 0,
      last_active: r.last_active || 'Never',
      recent_resources: recentResources || [],
    };
  });

  // Topic engagement breakdown (highest to lowest)
  let topicEngagementQuery = `
    SELECT 
      unit_name, 
      subject_name,
      SUM(CASE WHEN action_type = 'view' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN action_type = 'download' THEN 1 ELSE 0 END) as downloads,
      SUM(CASE WHEN action_type = 'interact' THEN 1 ELSE 0 END) as interacts,
      COUNT(*) as total
    FROM access_logs 
    WHERE unit_name IS NOT NULL AND unit_name != ''
  `;
  const topicParams: any[] = [];
  if (className) {
    topicEngagementQuery += ` AND class_name = ?`;
    topicParams.push(className);
  }
  topicEngagementQuery += ` GROUP BY unit_name, subject_name ORDER BY total DESC LIMIT 10`;
  const topicEngagement: any[] = db.prepare(topicEngagementQuery).all(...topicParams);

  // Recent activity stream
  let recentQuery = `SELECT * FROM access_logs WHERE 1=1`;
  const recentParams: any[] = [];
  if (className) {
    recentQuery += ` AND class_name = ?`;
    recentParams.push(className);
  }
  recentQuery += ` ORDER BY accessed_at DESC LIMIT 25`;
  const recentActivity: any[] = db.prepare(recentQuery).all(...recentParams);

  return {
    totalActiveStudents,
    totalMaterialsAccessed,
    totalViewsThisWeek,
    totalDownloadsThisWeek,
    mostPopularTopic: popTopicRow || null,
    studentRoster,
    topicEngagement,
    recentActivity,
  };
}
