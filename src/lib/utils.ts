export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(timestamp: number, format: 'date' | 'datetime' | 'time' = 'datetime'): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  if (format === 'date') return `${year}-${month}-${day}`
  if (format === 'time') return `${hour}:${minute}`
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function isOverdue(dueDate: number): boolean {
  return !isNaN(dueDate) && dueDate < Date.now()
}

export function calcCompletionRate(total: number, completed: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function checkTimeConflict(
  startA: number, endA: number,
  startB: number, endB: number
): boolean {
  return startA < endB && endA > startB
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3']
export const ALLOWED_PDF_TYPES = ['application/pdf']
export const ALLOWED_EVENT_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES]
export const ALLOWED_SCORE_TYPES = [...ALLOWED_PDF_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateFile(file: File, allowedTypes: string[]): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `不支持的文件格式，仅支持: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `文件大小超出限制，最大 10MB，当前 ${formatFileSize(file.size)}`
  }
  return null
}
