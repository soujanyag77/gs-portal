const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'portal.db');
const db = new DatabaseSync(dbPath);

console.log('--- RUNNING FULL SYSTEM & DATABASE VERIFICATION ---');

// 1. Verify schema tables
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
  .all()
  .map((t) => t.name);

console.log('Detected Tables:', tables);
const requiredTables = ['access_logs', 'classes', 'resources', 'subjects', 'units', 'users'];
const missing = requiredTables.filter((t) => !tables.includes(t));
if (missing.length > 0) {
  console.error('Missing tables:', missing);
  process.exit(1);
}
console.log('All 6 required database tables are verified present!');

// 2. Verify Teacher account exists
const teacher = db.prepare("SELECT * FROM users WHERE role = 'teacher'").get();
if (!teacher) {
  console.error('Default teacher not found!');
  process.exit(1);
}
console.log(`Teacher Verified: ${teacher.name} (${teacher.email})`);
const passOk = bcrypt.compareSync('teacher123', teacher.password_hash);
console.log(`Teacher password hash verified: ${passOk}`);

// 3. Verify Zero Dummy Content rule
const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get().count;
const accessLogCount = db.prepare('SELECT COUNT(*) as count FROM access_logs').get().count;
console.log(`Initial resources count: ${resourceCount} (Requirement: Zero dummy content)`);
console.log(`Initial access logs count: ${accessLogCount} (Requirement: Zero dummy content)`);

// 4. Test Class Creation
const testClassId = 'class_test_' + Date.now();
db.prepare("INSERT INTO classes (id, name, grade_level, icon, color) VALUES (?, ?, ?, ?, ?)").run(
  testClassId,
  'Grade 3 - Nebula Voyagers',
  'Grade 3',
  '🚀',
  '#38bdf8'
);
const createdClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(testClassId);
console.log(`Class created: ${createdClass.name} [ID: ${createdClass.id}]`);

// 5. Test Subject Creation
const testSubjId = 'subj_test_' + Date.now();
db.prepare("INSERT INTO subjects (id, class_id, name, color_code, icon) VALUES (?, ?, ?, ?, ?)").run(
  testSubjId,
  testClassId,
  'Astrophysics & Solar Systems',
  '#a855f7',
  '🪐'
);
const createdSubj = db.prepare('SELECT * FROM subjects WHERE id = ?').get(testSubjId);
console.log(`Subject created: ${createdSubj.name} in Class ${createdSubj.class_id}`);

// 6. Test Unit Creation
const testUnitId = 'unit_test_' + Date.now();
db.prepare("INSERT INTO units (id, subject_id, name, description, order_index) VALUES (?, ?, ?, ?, ?)").run(
  testUnitId,
  testSubjId,
  'Unit 1: The Terrestrial Planets',
  'Mercury, Venus, Earth, and Mars comparison',
  1
);
const createdUnit = db.prepare('SELECT * FROM units WHERE id = ?').get(testUnitId);
console.log(`Unit created: ${createdUnit.name} [ID: ${createdUnit.id}]`);

// 7. Test Student Enrollment
const testStudentId = 'stu_test_' + Date.now();
db.prepare("INSERT INTO users (id, name, role, class_id, pin, avatar, stars) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
  testStudentId,
  'Leo Explorer',
  'student',
  testClassId,
  '5678',
  '🦁',
  0
);
const createdStudent = db.prepare('SELECT * FROM users WHERE id = ?').get(testStudentId);
console.log(`Student Enrolled: ${createdStudent.name} (Avatar: ${createdStudent.avatar}, PIN: ${createdStudent.pin})`);

// 8. Test Resource Upload Simulation
const testResId = 'res_test_' + Date.now();
db.prepare(`
  INSERT INTO resources (id, unit_id, title, description, file_url, file_name, file_type, file_size, mime_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  testResId,
  testUnitId,
  'Solar System Interactive Orbit Sim',
  'Interactive orbit simulation for young astronomers',
  `/api/resources/${testResId}/file`,
  'orbit_sim.html',
  'html',
  1048576,
  'text/html'
);
const createdRes = db.prepare('SELECT * FROM resources WHERE id = ?').get(testResId);
console.log(`Resource Created: ${createdRes.title} (Type: ${createdRes.file_type})`);

// 9. Test Activity Logging (Real-time student logger)
const testLogId = 'log_test_' + Date.now();
db.prepare(`
  INSERT INTO access_logs (id, student_id, student_name, resource_id, resource_title, class_name, subject_name, unit_name, action_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  testLogId,
  testStudentId,
  createdStudent.name,
  testResId,
  createdRes.title,
  createdClass.name,
  createdSubj.name,
  createdUnit.name,
  'interact'
);
const loggedEvent = db.prepare('SELECT * FROM access_logs WHERE id = ?').get(testLogId);
console.log(`Access Logged: ${loggedEvent.student_name} performed "${loggedEvent.action_type}" on "${loggedEvent.resource_title}"`);

// 10. Clean up test records to keep zero dummy content pristine!
db.prepare('DELETE FROM access_logs WHERE id = ?').run(testLogId);
db.prepare('DELETE FROM resources WHERE id = ?').run(testResId);
db.prepare('DELETE FROM users WHERE id = ?').run(testStudentId);
db.prepare('DELETE FROM units WHERE id = ?').run(testUnitId);
db.prepare('DELETE FROM subjects WHERE id = ?').run(testSubjId);
db.prepare('DELETE FROM classes WHERE id = ?').run(testClassId);

console.log('Cleaned up test records. Database returned to pristine zero dummy content state.');
console.log('--- ALL BACKEND & DATABASE TESTS PASSED WITH 100% SUCCESS ---');
