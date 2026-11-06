import { FileType } from './types';

export interface FileTypeInfo {
  type: FileType;
  label: string;
  badgeColor: string;
  badgeBg: string;
  emoji: string;
  acceptedExtensions: string[];
}

export const FILE_TYPE_MAP: Record<FileType, FileTypeInfo> = {
  pdf: {
    type: 'pdf',
    label: 'PDF Reader',
    badgeColor: 'text-rose-600',
    badgeBg: 'bg-rose-100 border-rose-300',
    emoji: '📄',
    acceptedExtensions: ['.pdf'],
  },
  html: {
    type: 'html',
    label: 'Interactive Game / Sim',
    badgeColor: 'text-violet-600',
    badgeBg: 'bg-violet-100 border-violet-300',
    emoji: '🎮',
    acceptedExtensions: ['.html', '.htm', '.zip'],
  },
  image: {
    type: 'image',
    label: 'Picture / Art',
    badgeColor: 'text-amber-600',
    badgeBg: 'bg-amber-100 border-amber-300',
    emoji: '🖼️',
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
  },
  audio: {
    type: 'audio',
    label: 'Audio / Story',
    badgeColor: 'text-sky-600',
    badgeBg: 'bg-sky-100 border-sky-300',
    emoji: '🎵',
    acceptedExtensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
  },
  video: {
    type: 'video',
    label: 'Video Lesson',
    badgeColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    emoji: '🎬',
    acceptedExtensions: ['.mp4', '.webm', '.ogv', '.mov', '.m4v'],
  },
  document: {
    type: 'document',
    label: 'Worksheet / Slides',
    badgeColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-100 border-indigo-300',
    emoji: '📝',
    acceptedExtensions: ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv'],
  },
  other: {
    type: 'other',
    label: 'File Resource',
    badgeColor: 'text-slate-600',
    badgeBg: 'bg-slate-100 border-slate-300',
    emoji: '📦',
    acceptedExtensions: [],
  },
};

export function detectFileType(fileName: string, mimeType?: string): FileType {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  if (['.pdf'].includes(ext) || mimeType?.includes('pdf')) {
    return 'pdf';
  }
  if (['.html', '.htm', '.zip'].includes(ext) || mimeType?.includes('html') || mimeType?.includes('zip')) {
    return 'html';
  }
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext) || mimeType?.startsWith('image/')) {
    return 'image';
  }
  if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext) || mimeType?.startsWith('audio/')) {
    return 'audio';
  }
  if (['.mp4', '.webm', '.ogv', '.mov', '.m4v'].includes(ext) || mimeType?.startsWith('video/')) {
    return 'video';
  }
  if (
    ['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.txt', '.csv'].includes(ext) ||
    mimeType?.includes('officedocument') ||
    mimeType?.includes('msword') ||
    mimeType?.includes('powerpoint') ||
    mimeType?.includes('excel') ||
    mimeType?.startsWith('text/')
  ) {
    return 'document';
  }

  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
