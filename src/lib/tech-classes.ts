import { getClasses, addClass, getSubjects, addSubject } from './data-service';
import { ClassItem } from './types';

export interface StandardTechClassSpec {
  name: string;
  grade_level: string;
  section: string;
  subject_name: string;
  class_icon: string;
  class_color: string;
  subject_icon: string;
  subject_color: string;
  description: string;
}

export const STANDARD_TECH_CLASSES: StandardTechClassSpec[] = [
  {
    name: 'X A AI',
    grade_level: 'Grade 10 (Class X)',
    section: 'A',
    subject_name: 'Artificial Intelligence',
    class_icon: '🤖',
    class_color: '#6366f1',
    subject_icon: '🤖',
    subject_color: '#6366f1',
    description: 'Class 10 Section A - Artificial Intelligence & Data Science',
  },
  {
    name: 'X B AI',
    grade_level: 'Grade 10 (Class X)',
    section: 'B',
    subject_name: 'Artificial Intelligence',
    class_icon: '🧠',
    class_color: '#8b5cf6',
    subject_icon: '🧠',
    subject_color: '#8b5cf6',
    description: 'Class 10 Section B - Artificial Intelligence & Machine Learning',
  },
  {
    name: 'XI AI',
    grade_level: 'Grade 11 (Class XI)',
    section: 'AI',
    subject_name: 'Artificial Intelligence',
    class_icon: '🤖',
    class_color: '#a855f7',
    subject_icon: '🤖',
    subject_color: '#a855f7',
    description: 'Class 11 - Artificial Intelligence & Neural Networks',
  },
  {
    name: 'XI CS',
    grade_level: 'Grade 11 (Class XI)',
    section: 'CS',
    subject_name: 'Computer Science',
    class_icon: '💻',
    class_color: '#2563eb',
    subject_icon: '💻',
    subject_color: '#2563eb',
    description: 'Class 11 - Computer Science & Python Programming',
  },
  {
    name: 'XII AI',
    grade_level: 'Grade 12 (Class XII)',
    section: 'AI',
    subject_name: 'Artificial Intelligence',
    class_icon: '👑',
    class_color: '#e11d48',
    subject_icon: '🤖',
    subject_color: '#e11d48',
    description: 'Class 12 - Advanced Artificial Intelligence & Deep Learning',
  },
  {
    name: 'XII CS',
    grade_level: 'Grade 12 (Class XII)',
    section: 'CS',
    subject_name: 'Computer Science',
    class_icon: '💻',
    class_color: '#0284c7',
    subject_icon: '💻',
    subject_color: '#0284c7',
    description: 'Class 12 - Computer Science, Data Structures & Networking',
  },
];

/**
 * Provision all standard tech classes and their default subjects
 * Idempotent: Skips classes and subjects that already exist.
 */
export async function provisionStandardTechClasses(): Promise<{
  created: string[];
  existing: string[];
  classes: ClassItem[];
}> {
  const existingClasses = await getClasses();
  const created: string[] = [];
  const existing: string[] = [];

  for (const spec of STANDARD_TECH_CLASSES) {
    let targetClass = existingClasses.find(
      (c) => c.name.trim().toLowerCase() === spec.name.toLowerCase()
    );

    if (!targetClass) {
      targetClass = await addClass({
        name: spec.name,
        grade_level: spec.grade_level,
        icon: spec.class_icon,
        color: spec.class_color,
      });
      created.push(spec.name);
    } else {
      existing.push(spec.name);
    }

    // Ensure subject exists for this class
    if (targetClass?.id) {
      const existingSubjects = await getSubjects(targetClass.id);
      const targetSubj = existingSubjects.find(
        (s) => s.name.trim().toLowerCase() === spec.subject_name.toLowerCase()
      );
      if (!targetSubj) {
        await addSubject({
          class_id: targetClass.id,
          name: spec.subject_name,
          color_code: spec.subject_color,
          icon: spec.subject_icon,
        });
      }
    }
  }

  const updatedClasses = await getClasses();
  return { created, existing, classes: updatedClasses };
}
