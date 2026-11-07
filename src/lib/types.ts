export type Role = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  role: Role;
  class_id?: string | null;
  pin?: string | null;
  avatar: string;
  stars?: number;
  created_at?: string;
  class_name?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  grade_level?: string | null;
  icon?: string;
  color?: string;
  created_at?: string;
  subject_count?: number;
  student_count?: number;
  resource_count?: number;
}

export interface SubjectItem {
  id: string;
  class_id: string;
  name: string;
  color_code: string;
  icon: string;
  created_at?: string;
  unit_count?: number;
  resource_count?: number;
}

export interface UnitItem {
  id: string;
  subject_id: string;
  name: string;
  description?: string | null;
  order_index?: number;
  created_at?: string;
  resource_count?: number;
}

export type FileType = 'pdf' | 'html' | 'image' | 'audio' | 'video' | 'document' | 'other';

export interface ResourceItem {
  id: string;
  unit_id: string;
  title: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  file_type: FileType;
  file_size: number;
  mime_type?: string | null;
  interactive_entry_url?: string;
  download_count: number;
  view_count: number;
  created_at: string;
  unit_name?: string;
  subject_id?: string;
  subject_name?: string;
  class_id?: string;
  class_name?: string;
}

export type ActionType = 'view' | 'download' | 'interact' | 'complete';

export interface AccessLogItem {
  id: string;
  student_id: string;
  student_name: string;
  resource_id: string;
  resource_title: string;
  class_name?: string | null;
  subject_name?: string | null;
  unit_name?: string | null;
  action_type: ActionType;
  accessed_at: string;
}

export interface AnalyticsSummary {
  totalActiveStudents: number;
  totalMaterialsAccessed: number;
  totalViewsThisWeek: number;
  totalDownloadsThisWeek: number;
  mostPopularTopic: {
    unit_name: string;
    subject_name: string;
    count: number;
  } | null;
  studentRoster: Array<{
    student_id: string;
    student_name: string;
    avatar: string;
    class_name: string;
    materials_accessed: number;
    last_active: string;
    recent_resources: Array<{
      title: string;
      subject: string;
      unit: string;
      action_type: string;
      accessed_at: string;
    }>;
  }>;
  topicEngagement: Array<{
    unit_name: string;
    subject_name: string;
    views: number;
    downloads: number;
    interacts: number;
    total: number;
  }>;
  recentActivity: AccessLogItem[];
}
