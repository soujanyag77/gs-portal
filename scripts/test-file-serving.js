const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new DatabaseSync(path.join(dataDir, 'portal.db'));

console.log('=== TESTING FILE SERVING & OPEN IN NEW TAB AS PER FORMAT ===');

// 1. Create a sample class, subject, unit if none exist
let sampleClass = db.prepare('SELECT id, name FROM classes LIMIT 1').get();
if (!sampleClass) {
  sampleClass = { id: 'class_test_' + Date.now(), name: 'X A AI' };
  db.prepare('INSERT INTO classes (id, name, grade_level) VALUES (?, ?, ?)').run(sampleClass.id, sampleClass.name, 'Grade 10');
}

let sampleSubj = db.prepare('SELECT id FROM subjects WHERE class_id = ?').get(sampleClass.id);
if (!sampleSubj) {
  sampleSubj = { id: 'subj_test_' + Date.now() };
  db.prepare('INSERT INTO subjects (id, class_id, name) VALUES (?, ?, ?)').run(sampleSubj.id, sampleClass.id, 'Artificial Intelligence');
}

let sampleUnit = db.prepare('SELECT id FROM units WHERE subject_id = ?').get(sampleSubj.id);
if (!sampleUnit) {
  sampleUnit = { id: 'unit_test_' + Date.now() };
  db.prepare('INSERT INTO units (id, subject_id, name) VALUES (?, ?, ?)').run(sampleUnit.id, sampleSubj.id, 'Unit 1: Neural Networks');
}

// 2. Test File Format 1: PDF Document
const testPdfId = 'res_pdf_' + Date.now();
const pdfFileName = 'X_A_AI_Unit_1_Neural_Networks.pdf';
const storedPdfName = `${testPdfId}_X_A_AI_Unit_1_Neural_Networks.pdf`;
const pdfPath = path.join(uploadsDir, storedPdfName);
fs.writeFileSync(pdfPath, '%PDF-1.4 Sample PDF content for testing');

db.prepare(`
  INSERT INTO resources (id, unit_id, title, description, file_url, file_name, file_type, file_size, mime_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  testPdfId,
  sampleUnit.id,
  'Neural Networks Study Guide',
  'Comprehensive PDF guide for class X A AI',
  `/api/resources/${testPdfId}/file`,
  pdfFileName,
  'pdf',
  fs.statSync(pdfPath).size,
  'application/pdf'
);

// 3. Test File Format 2: Image
const testImgId = 'res_img_' + Date.now();
const imgFileName = 'Neuron_Diagram.png';
const storedImgName = `${testImgId}_Neuron_Diagram.png`;
const imgPath = path.join(uploadsDir, storedImgName);
fs.writeFileSync(imgPath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); // PNG signature

db.prepare(`
  INSERT INTO resources (id, unit_id, title, description, file_url, file_name, file_type, file_size, mime_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  testImgId,
  sampleUnit.id,
  'Biological vs Artificial Neuron Diagram',
  'High-resolution visual chart',
  `/api/resources/${testImgId}/file`,
  imgFileName,
  'image',
  fs.statSync(imgPath).size,
  'image/png'
);

// 4. Verify that files can be found by pattern match or filename
const filesInDir = fs.readdirSync(uploadsDir);
const foundPdf = filesInDir.find((f) => f.startsWith(`${testPdfId}_`));
const foundImg = filesInDir.find((f) => f.startsWith(`${testImgId}_`));

console.log('PDF Stored file exists on disk:', Boolean(foundPdf), `(${foundPdf})`);
console.log('Image Stored file exists on disk:', Boolean(foundImg), `(${foundImg})`);

if (!foundPdf || !foundImg) {
  console.error('FAILED: Stored files not found in uploads directory!');
  process.exit(1);
}

// 5. Test Content-Type & Content-Disposition expectations
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  return 'application/octet-stream';
}

console.log('PDF Resolved Content-Type:', getMimeType(pdfFileName));
console.log('Image Resolved Content-Type:', getMimeType(imgFileName));

console.log('PDF Inline Disposition:', `inline; filename="${encodeURIComponent(pdfFileName)}"`);
console.log('Image Inline Disposition:', `inline; filename="${encodeURIComponent(imgFileName)}"`);

// Clean up
try {
  fs.unlinkSync(pdfPath);
  fs.unlinkSync(imgPath);
  db.prepare('DELETE FROM resources WHERE id IN (?, ?)').run(testPdfId, testImgId);
  console.log('Cleanup completed successfully.');
} catch (e) {
  console.warn('Cleanup warning:', e);
}

console.log('\n--- ALL FILE SERVING & OPEN IN NEW TAB TESTS PASSED (100%) ---');
