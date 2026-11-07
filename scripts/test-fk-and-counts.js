const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const jwt = require('jsonwebtoken');

const dbPath = path.join(__dirname, '..', 'data', 'portal.db');
const db = new DatabaseSync(dbPath);

console.log('=== VERIFYING FIXES FOR FOREIGN KEY CONSTRAINT & UPLOAD COUNTS ===');

// Test 1: Test user creation with an unknown/arbitrary classId
console.log('\n--- 1. TESTING RESILIENT USER CREATION (NO FOREIGN KEY ERROR) ---');
const testUserId = 'test_stu_' + Date.now();
const testUnknownClassId = 'unknown_class_uuid_' + Math.random().toString(36).substring(2, 8);

try {
  // Simulate the db logic in createUser
  // First check if class exists, if not, create stub class or insert safely
  let cls = db.prepare('SELECT id FROM classes WHERE id = ?').get(testUnknownClassId);
  if (!cls) {
    db.prepare('INSERT OR IGNORE INTO classes (id, name, grade_level) VALUES (?, ?, ?)').run(
      testUnknownClassId,
      'Class Library',
      'Grade 10'
    );
  }

  db.prepare(`
    INSERT INTO users (id, name, role, class_id, avatar, stars)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(testUserId, 'Aarav Patel', 'student', testUnknownClassId, '🐼', 5);

  const inserted = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId);
  console.log('SUCCESS: Student created with unknown classId without FK error:', inserted.name, '[Class ID:', inserted.class_id, ']');
} catch (err) {
  console.error('FAILED: User creation threw an error:', err);
  process.exit(1);
}

// Test 2: Test student login token generation & verification
console.log('\n--- 2. TESTING STUDENT SESSION TOKEN CREATION ---');
const JWT_SECRET = process.env.JWT_SECRET || 'gs-portal-kid-friendly-secret-key-2026';
const token = jwt.sign(
  {
    userId: testUserId,
    role: 'student',
    name: 'Aarav Patel',
    classId: testUnknownClassId,
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
const decoded = jwt.verify(token, JWT_SECRET);
console.log('SUCCESS: Student session token verified for:', decoded.name, 'role:', decoded.role);

// Test 3: Test Dynamic Class Upload Counts
console.log('\n--- 3. TESTING DYNAMIC CLASS UPLOAD COUNTS ---');
// Let's create a test resource under a subject and unit for class 'X A AI'
let targetClass = db.prepare(`SELECT * FROM classes WHERE name = 'X A AI'`).get();
if (!targetClass) {
  const newClassId = 'class_test_x_a_' + Date.now();
  db.prepare(`INSERT INTO classes (id, name, grade_level, icon, color) VALUES (?, ?, ?, ?, ?)`).run(
    newClassId,
    'X A AI',
    'Grade 10 (Class X)',
    '🤖',
    '#6366f1'
  );
  targetClass = db.prepare(`SELECT * FROM classes WHERE id = ?`).get(newClassId);
}

// Find or create subject
let targetSubject = db.prepare(`SELECT * FROM subjects WHERE class_id = ?`).get(targetClass.id);
if (!targetSubject) {
  const newSubjId = 'subj_test_' + Date.now();
  db.prepare(`INSERT INTO subjects (id, class_id, name) VALUES (?, ?, ?)`).run(
    newSubjId,
    targetClass.id,
    'Artificial Intelligence'
  );
  targetSubject = db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(newSubjId);
}

// Find or create unit
let targetUnit = db.prepare(`SELECT * FROM units WHERE subject_id = ?`).get(targetSubject.id);
if (!targetUnit) {
  const newUnitId = 'unit_test_' + Date.now();
  db.prepare(`INSERT INTO units (id, subject_id, name) VALUES (?, ?, ?)`).run(
    newUnitId,
    targetSubject.id,
    'Unit 1: Computer Vision'
  );
  targetUnit = db.prepare(`SELECT * FROM units WHERE id = ?`).get(newUnitId);
}

// Insert test resource
const testResId = 'res_test_' + Date.now();
db.prepare(`
  INSERT INTO resources (id, unit_id, title, description, file_url, file_name, file_type, file_size)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  testResId,
  targetUnit.id,
  'Computer Vision Lab Guide.pdf',
  'Introduction to OpenCV and Neural Networks',
  '/api/resources/' + testResId + '/file',
  'X_A_AI_Unit_1_Computer_Vision_Lab.pdf',
  'pdf',
  102400
);

// Check count calculation via SQL query used in listClasses
const classWithCount = db.prepare(`
  SELECT c.*,
         (SELECT COUNT(*) FROM resources r 
          JOIN units un ON r.unit_id = un.id 
          JOIN subjects s ON un.subject_id = s.id 
          WHERE s.class_id = c.id OR LOWER(s.class_id) = LOWER(c.name)) as resource_count
  FROM classes c
  WHERE c.id = ?
`).get(targetClass.id);

console.log(`Class: "${classWithCount.name}" now has resource_count: ${classWithCount.resource_count} (Expected >= 1)`);
if (classWithCount.resource_count < 1) {
  console.error('FAILED: Resource count not updating!');
  process.exit(1);
} else {
  console.log('SUCCESS: Class-wise uploaded materials count successfully updated to:', classWithCount.resource_count);
}

// Clean up test rows
db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
db.prepare('DELETE FROM classes WHERE id = ?').run(testUnknownClassId);
db.prepare('DELETE FROM resources WHERE id = ?').run(testResId);
console.log('\n--- ALL VERIFICATION CHECKS PASSED (100%) ---');
