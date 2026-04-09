import Dexie, { type Table } from 'dexie'
import type { Band, Member, FileBlob, BandEvent, Task, Score, Setlist, Backup } from '@/types'
import { generateId } from './utils'

export { generateId }

class BandManagerDB extends Dexie {
  bands!: Table<Band>
  members!: Table<Member>
  file_blobs!: Table<FileBlob>
  events!: Table<BandEvent>
  tasks!: Table<Task>
  scores!: Table<Score>
  setlists!: Table<Setlist>
  backups!: Table<Backup>

  constructor() {
    super('BandManagerDB')
    this.version(1).stores({
      bands: 'id, createdAt',
      members: 'id, [bandId+role], bandId, role',
      file_blobs: 'id, bandId, uploadedAt',
      events: 'id, [bandId+startTime+endTime], bandId, startTime, endTime',
      tasks: 'id, [bandId+assigneeMemberId], eventId, dueDate, bandId, assigneeMemberId',
      scores: 'id, bandId, songName, *tags, uploadedAt',
      setlists: 'id, bandId, updatedAt',
      backups: 'id, [bandId+timestamp], bandId, timestamp',
    })
  }
}

export const db = new BandManagerDB()

// 数据库工具函数
export async function getDBSize(): Promise<number> {
  const blobs = await db.file_blobs.toArray()
  return blobs.reduce((sum, b) => sum + b.fileSize, 0)
}

export async function getBandStorageUsed(bandId: string): Promise<number> {
  const blobs = await db.file_blobs.where('bandId').equals(bandId).toArray()
  return blobs.reduce((sum, b) => sum + b.fileSize, 0)
}

export const BAND_STORAGE_LIMIT = 500 * 1024 * 1024 // 500MB
