import { isSupabaseConfigured } from './supabase/config';
import { createServerSupabaseClient, createServerSupabaseAdminClient } from './supabase/server';
import * as localDb from './db';
import {
  ClassItem,
  SubjectItem,
  UnitItem,
  ResourceItem,
  User,
  AccessLogItem,
  AnalyticsSummary,
} from './types';

// ==============================================================================
// CLASSES
// ==============================================================================

export async function getClasses(): Promise<ClassItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      const suClasses: ClassItem[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        grade_level: c.grade_level || 'Grade 1',
        icon: c.icon || '🎒',
        color: c.color || '#38bdf8',
        created_at: c.created_at,
      }));

      // Merge with any local classes so created classes never disappear
      const localClasses = localDb.listClasses();
      const merged: ClassItem[] = [...suClasses];
      for (const lc of localClasses) {
        if (!merged.some((m) => m.id === lc.id || m.name.toLowerCase() === lc.name.toLowerCase())) {
          merged.push(lc);
        }
      }
      return merged;
    } catch (err) {
      console.warn('Supabase getClasses error, falling back to local:', err);
    }
  }
  return localDb.listClasses();
}

export async function addClass(cls: {
  name: string;
  grade_level?: string;
  icon?: string;
  color?: string;
}): Promise<ClassItem> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: cls.name,
          grade_level: cls.grade_level || 'Grade 1',
          icon: cls.icon || '🎒',
          color: cls.color || '#38bdf8',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('Supabase addClass warning, saving to local fallback:', err?.message || err);
    }
  }
  const id = 'class_' + Math.random().toString(36).substring(2, 10);
  return localDb.createClass({ id, ...cls });
}

export async function removeClass(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase removeClass error:', err);
    }
  }
  return localDb.deleteClass(id);
}

// ==============================================================================
// SUBJECTS
// ==============================================================================

export async function getSubjects(classId?: string): Promise<SubjectItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      let query = supabase.from('subjects').select('*').order('name', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase getSubjects error, falling back to local:', err);
    }
  }
  return localDb.listSubjects(classId);
}

export async function addSubject(subj: {
  class_id: string;
  name: string;
  color_code?: string;
  icon?: string;
}): Promise<SubjectItem> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          class_id: subj.class_id,
          name: subj.name,
          color_code: subj.color_code || '#38bdf8',
          icon: subj.icon || '📚',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase addSubject error:', err);
    }
  }
  const id = 'subj_' + Math.random().toString(36).substring(2, 10);
  return localDb.createSubject({ id, ...subj });
}

export async function removeSubject(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase removeSubject error:', err);
    }
  }
  return localDb.deleteSubject(id);
}

// ==============================================================================
// UNITS
// ==============================================================================

export async function getUnits(subjectId?: string): Promise<UnitItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      let query = supabase
        .from('units')
        .select('*')
        .order('order_index', { ascending: true });
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase getUnits error, falling back to local:', err);
    }
  }
  return localDb.listUnits(subjectId);
}

export async function addUnit(unit: {
  subject_id: string;
  name: string;
  description?: string;
  order_index?: number;
}): Promise<UnitItem> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('units')
        .insert({
          subject_id: unit.subject_id,
          name: unit.name,
          description: unit.description || '',
          order_index: unit.order_index || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase addUnit error:', err);
    }
  }
  const id = 'unit_' + Math.random().toString(36).substring(2, 10);
  return localDb.createUnit({ id, ...unit });
}

export async function removeUnit(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase removeUnit error:', err);
    }
  }
  return localDb.deleteUnit(id);
}

// ==============================================================================
// STUDENTS
// ==============================================================================

export async function getStudents(classId?: string): Promise<User[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      let query = supabase
        .from('profiles')
        .select('*, classes(name)')
        .eq('role', 'student')
        .order('name', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: 'student',
        class_id: p.class_id,
        class_name: p.classes?.name,
        avatar: p.avatar || '🦊',
        stars: p.stars || 0,
        pin: p.pin,
        created_at: p.created_at,
      }));
    } catch (err) {
      console.warn('Supabase getStudents error, falling back to local:', err);
    }
  }
  return localDb.listStudentsByClass(classId);
}

export async function addStudent(stu: {
  name: string;
  class_id: string;
  pin?: string;
  avatar?: string;
}): Promise<User> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      // Generate a uuid for the profile
      const newId = '00000000-0000-4000-a000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          name: stu.name,
          role: 'student',
          class_id: stu.class_id,
          pin: stu.pin || '1234',
          avatar: stu.avatar || '🦊',
          stars: 0,
        })
        .select('*, classes(name)')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          role: 'student',
          class_id: data.class_id,
          class_name: data.classes?.name,
          avatar: data.avatar,
          stars: data.stars || 0,
          pin: data.pin,
        };
      }
    } catch (err) {
      console.warn('Supabase addStudent error:', err);
    }
  }
  const id = 'stu_' + Math.random().toString(36).substring(2, 10);
  return localDb.createUser({
    id,
    name: stu.name,
    role: 'student',
    class_id: stu.class_id,
    pin: stu.pin,
    avatar: stu.avatar,
  });
}

export async function removeStudent(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase removeStudent error:', err);
    }
  }
  return localDb.deleteStudent(id);
}

// ==============================================================================
// RESOURCES
// ==============================================================================

export async function getResources(filters?: {
  class_id?: string;
  subject_id?: string;
  unit_id?: string;
  file_type?: string;
  search?: string;
}): Promise<ResourceItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      let query = supabase
        .from('resources')
        .select(`
          *,
          units!inner (
            name,
            subjects!inner (
              id,
              name,
              classes!inner (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.unit_id) {
        query = query.eq('unit_id', filters.unit_id);
      }
      if (filters?.file_type && filters.file_type !== 'all') {
        query = query.eq('file_type', filters.file_type);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        let results = data.map((r: any) => ({
          id: r.id,
          unit_id: r.unit_id,
          title: r.title,
          description: r.description,
          file_url: r.file_url,
          file_name: r.file_name,
          file_type: r.file_type,
          file_size: Number(r.file_size) || 0,
          mime_type: r.mime_type,
          download_count: r.download_count || 0,
          view_count: r.view_count || 0,
          created_at: r.created_at,
          unit_name: r.units?.name,
          subject_id: r.units?.subjects?.id,
          subject_name: r.units?.subjects?.name,
          class_id: r.units?.subjects?.classes?.id,
          class_name: r.units?.subjects?.classes?.name,
        }));

        if (filters?.class_id) {
          results = results.filter((r) => r.class_id === filters.class_id);
        }
        if (filters?.subject_id) {
          results = results.filter((r) => r.subject_id === filters.subject_id);
        }
        return results;
      }
    } catch (err) {
      console.warn('Supabase getResources error, falling back to local:', err);
    }
  }
  return localDb.listResources(filters);
}

export async function addResource(res: {
  id: string;
  unit_id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_type: any;
  file_size?: number;
  mime_type?: string;
}): Promise<ResourceItem> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { data, error } = await supabase
        .from('resources')
        .insert({
          id: res.id.includes('-') ? res.id : undefined,
          unit_id: res.unit_id,
          title: res.title,
          description: res.description || '',
          file_url: res.file_url,
          file_name: res.file_name,
          file_type: res.file_type,
          file_size: res.file_size || 0,
          mime_type: res.mime_type || '',
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          unit_id: data.unit_id,
          title: data.title,
          description: data.description,
          file_url: data.file_url,
          file_name: data.file_name,
          file_type: data.file_type,
          file_size: Number(data.file_size) || 0,
          mime_type: data.mime_type,
          download_count: 0,
          view_count: 0,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn('Supabase addResource error:', err);
    }
  }
  return localDb.createResource(res);
}

export async function removeResource(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseAdminClient();
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase removeResource error:', err);
    }
  }
  return localDb.deleteResource(id);
}

// ==============================================================================
// ACTIVITY LOGGING & ANALYTICS
// ==============================================================================

export async function recordActivityLog(log: {
  student_id: string;
  student_name: string;
  resource_id: string;
  resource_title: string;
  class_name?: string;
  subject_name?: string;
  unit_name?: string;
  action_type: any;
}): Promise<any> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('activity_logs').insert({
        student_id: log.student_id.includes('-') ? log.student_id : undefined,
        student_name: log.student_name,
        resource_id: log.resource_id.includes('-') ? log.resource_id : undefined,
        resource_title: log.resource_title,
        class_name: log.class_name || '',
        subject_name: log.subject_name || '',
        unit_name: log.unit_name || '',
        action_type: log.action_type,
      });
      return { success: true };
    } catch (err) {
      console.warn('Supabase recordActivityLog error:', err);
    }
  }
  const id = 'log_' + Math.random().toString(36).substring(2, 10);
  return localDb.logActivity({ id, ...log });
}

export async function getAnalytics(classId?: string): Promise<AnalyticsSummary> {
  // If localDb works or as fallback
  try {
    return localDb.getAnalyticsSummary(classId);
  } catch {
    return {
      totalActiveStudents: 0,
      totalMaterialsAccessed: 0,
      totalViewsThisWeek: 0,
      totalDownloadsThisWeek: 0,
      mostPopularTopic: null,
      studentRoster: [],
      topicEngagement: [],
      recentActivity: [],
    };
  }
}
