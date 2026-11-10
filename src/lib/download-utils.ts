/**
 * Utility functions for robust cross-origin file downloads,
 * MIME type handling, file categorization, and file metadata display.
 */

export type FileCategory =
  | 'pdf'
  | 'image'
  | 'word'
  | 'sheet'
  | 'presentation'
  | 'code'
  | 'text'
  | 'audio'
  | 'video'
  | 'html'
  | 'archive'
  | 'other';

export interface FileCategoryMeta {
  category: FileCategory;
  label: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  iconBg: string;
  iconColor: string;
  emoji: string;
  ext: string;
}

/**
 * Triggers a robust browser download handling cross-origin signed URLs
 * (Supabase Storage, Cloudflare R2, AWS S3, Firebase) and local API routes.
 * Forces direct file download via Blob URL instead of opening in a new tab.
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  if (!url) {
    console.error('Cannot download: URL is empty');
    return false;
  }

  // Ensure download query parameter for local API routes
  let targetUrl = url;
  if (url.includes('/api/resources/') && !url.includes('download=')) {
    targetUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Download request failed with status: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'downloaded-file';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Give time for download stream to initiate before revoking object URL
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);

    return true;
  } catch (err) {
    console.warn('Direct Blob download failed or blocked by CORS, falling back to anchor trigger:', err);
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = filename || 'downloaded-file';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (fallbackErr) {
      console.error('Fallback download also failed, opening window:', fallbackErr);
      window.open(targetUrl, '_blank');
      return false;
    }
  }
}

/**
 * Detects the file category and styling metadata based on filename and optional mimeType
 */
export function getFileCategoryMeta(fileName: string = '', mimeType?: string | null): FileCategoryMeta {
  const cleanName = fileName.trim();
  const ext = (cleanName.includes('.') ? cleanName.slice(cleanName.lastIndexOf('.')) : '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // 1. PDF
  if (ext === '.pdf' || mime.includes('pdf')) {
    return {
      category: 'pdf',
      label: 'PDF Document',
      badgeBg: 'bg-rose-50',
      badgeColor: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      emoji: '📄',
      ext: '.pdf',
    };
  }

  // 2. Images
  if (
    ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.tiff'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return {
      category: 'image',
      label: 'Image / Picture',
      badgeBg: 'bg-amber-50',
      badgeColor: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      emoji: '🖼️',
      ext: ext || '.png',
    };
  }

  // 3. Word Documents
  if (
    ['.docx', '.doc', '.rtf', '.odt'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessingml')
  ) {
    return {
      category: 'word',
      label: 'Word Document',
      badgeBg: 'bg-blue-50',
      badgeColor: 'text-blue-700',
      badgeBorder: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      emoji: '📝',
      ext: ext || '.docx',
    };
  }

  // 4. Spreadsheets
  if (
    ['.xlsx', '.xls', '.csv', '.tsv', '.ods'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv'
  ) {
    return {
      category: 'sheet',
      label: 'Spreadsheet',
      badgeBg: 'bg-emerald-50',
      badgeColor: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      emoji: '📊',
      ext: ext || '.xlsx',
    };
  }

  // 5. Presentation Slides
  if (
    ['.pptx', '.ppt', '.odp', '.key'].includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return {
      category: 'presentation',
      label: 'Slide Presentation',
      badgeBg: 'bg-orange-50',
      badgeColor: 'text-orange-700',
      badgeBorder: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      emoji: '📑',
      ext: ext || '.pptx',
    };
  }

  // 6. Audio
  if (
    ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'].includes(ext) ||
    mime.startsWith('audio/')
  ) {
    return {
      category: 'audio',
      label: 'Audio Track',
      badgeBg: 'bg-sky-50',
      badgeColor: 'text-sky-700',
      badgeBorder: 'border-sky-200',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      emoji: '🎵',
      ext: ext || '.mp3',
    };
  }

  // 7. Video
  if (
    ['.mp4', '.webm', '.ogv', '.mov', '.m4v', '.mkv', '.avi'].includes(ext) ||
    mime.startsWith('video/')
  ) {
    return {
      category: 'video',
      label: 'Video Lesson',
      badgeBg: 'bg-teal-50',
      badgeColor: 'text-teal-700',
      badgeBorder: 'border-teal-200',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      emoji: '🎬',
      ext: ext || '.mp4',
    };
  }

  // 8. HTML Interactive
  if (['.html', '.htm'].includes(ext) || mime === 'text/html') {
    return {
      category: 'html',
      label: 'HTML5 Interactive',
      badgeBg: 'bg-violet-50',
      badgeColor: 'text-violet-700',
      badgeBorder: 'border-violet-200',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      emoji: '🎮',
      ext: '.html',
    };
  }

  // 9. Archives
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext) || mime.includes('zip') || mime.includes('archive')) {
    return {
      category: 'archive',
      label: 'Zip Archive',
      badgeBg: 'bg-indigo-50',
      badgeColor: 'text-indigo-700',
      badgeBorder: 'border-indigo-200',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      emoji: '📦',
      ext: ext || '.zip',
    };
  }

  // 10. Code & Development
  if (
    ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.sql', '.css', '.xml', '.java', '.c', '.cpp', '.cs', '.sh'].includes(ext) ||
    mime.includes('javascript') ||
    mime.includes('json')
  ) {
    return {
      category: 'code',
      label: 'Code / Script',
      badgeBg: 'bg-purple-50',
      badgeColor: 'text-purple-700',
      badgeBorder: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      emoji: '💻',
      ext: ext || '.code',
    };
  }

  // 11. Plain Text
  if (['.txt', '.md', '.log'].includes(ext) || mime.startsWith('text/')) {
    return {
      category: 'text',
      label: 'Text Document',
      badgeBg: 'bg-slate-100',
      badgeColor: 'text-slate-700',
      badgeBorder: 'border-slate-200',
      iconBg: 'bg-slate-200',
      iconColor: 'text-slate-700',
      emoji: '📄',
      ext: ext || '.txt',
    };
  }

  // Fallback
  return {
    category: 'other',
    label: ext ? `${ext.toUpperCase().replace('.', '')} File` : 'File Resource',
    badgeBg: 'bg-slate-50',
    badgeColor: 'text-slate-600',
    badgeBorder: 'border-slate-200',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    emoji: '📁',
    ext: ext || '',
  };
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(1))} ${sizes[idx]}`;
}

/**
 * Format date string into a clean, human-readable date
 */
export function formatUploadDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffHours < 48) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}
