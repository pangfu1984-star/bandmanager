// ==================== 乐队类型 ====================
export interface Band {
  id: string
  name: string
  foundedYear: number
  description: string
  createdAt: number
}

// ==================== 成员类型 ====================
export type MemberRole = 'admin' | 'member'

export interface Member {
  id: string
  bandId: string
  name: string
  instrument: string
  role: MemberRole
  createdAt: number
}

// ==================== 文件Blob类型 ====================
export interface FileBlob {
  id: string
  bandId: string
  fileName: string
  fileType: string
  fileSize: number
  blob: Blob
  uploadedAt: number
}

// ==================== 日程类型 ====================
export type EventType = 'rehearsal' | 'performance' | 'recording' | 'other'

export interface BandEvent {
  id: string
  bandId: string
  title: string
  type: EventType
  startTime: number
  endTime: number
  location: string
  notes: string
  attachmentIds: string[]
  creatorMemberId: string
  createdAt: number
}

// ==================== 任务类型 ====================
export interface Task {
  id: string
  eventId: string
  bandId: string
  title: string
  assigneeMemberId: string
  dueDate: number
  details: string
  completed: boolean
  completedAt: number
  creatorMemberId: string
  createdAt: number
}

// ==================== 乐谱类型 ====================
export type PartType = 'main' | 'part' | 'chord'

export interface Score {
  id: string
  bandId: string
  fileId: string
  songName: string
  key: string
  instrument: string
  partType: PartType
  tags: string[]
  uploadedAt: number
  fileType?: string
}

// ==================== 歌单类型 ====================
export interface SetlistSong {
  scoreId: string
  order: number
  notes: string
}

export interface Setlist {
  id: string
  bandId: string
  name: string
  description: string
  songs: SetlistSong[]
  updatedAt: number
}

// ==================== 备份类型 ====================
export interface Backup {
  id: string
  bandId: string
  timestamp: number
  snapshotData: string
}

// ==================== 权限操作类型 ====================
export type PermissionAction =
  | 'edit_band_info'
  | 'manage_members'
  | 'create_event'
  | 'edit_any_event'
  | 'delete_any_event'
  | 'create_task'
  | 'complete_any_task'
  | 'delete_others_task'
  | 'manage_scores'
  | 'add_score_to_setlist'
  | 'manage_setlists'
  | 'manage_backup'

// ==================== Toast类型 ====================
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

// ==================== 分页类型 ====================
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

// ==================== 视图模式 ====================
export type ViewMode = 'list' | 'grid'
export type TaskTab = 'pending' | 'completed' | 'overdue'
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
