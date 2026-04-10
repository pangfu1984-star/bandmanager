import { create } from 'zustand'
import { db, generateId } from '@/lib/db'
import type { Backup, Score } from '@/types'
import { formatFileSize } from '@/lib/utils'
import JSZip from 'jszip'

const MAX_BACKUPS = 5

interface BackupState {
  backups: Backup[]
  isLoading: boolean
  isExporting: boolean
  isImporting: boolean
  loadBackups: (bandId: string) => Promise<void>
  createAutoBackup: (bandId: string) => Promise<void>
  exportBackup: (bandId: string) => Promise<void>
  importBackup: (file: File) => Promise<void>
  restoreFromBackup: (backupId: string) => Promise<void>
  deleteBackup: (id: string) => Promise<void>
  clearBandData: (bandId: string) => Promise<void>
}

export const useBackupStore = create<BackupState>((set, get) => ({
  backups: [],
  isLoading: false,
  isExporting: false,
  isImporting: false,

  loadBackups: async (bandId) => {
    set({ isLoading: true })
    try {
      const backups = await db.backups.where('bandId').equals(bandId).reverse().sortBy('timestamp')
      set({ backups, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
    }
  },

  createAutoBackup: async (bandId) => {
    try {
      const [members, events, tasks, scores, setlists] = await Promise.all([
        db.members.where('bandId').equals(bandId).toArray(),
        db.events.where('bandId').equals(bandId).toArray(),
        db.tasks.where('bandId').equals(bandId).toArray(),
        db.scores.where('bandId').equals(bandId).toArray(),
        db.setlists.where('bandId').equals(bandId).toArray(),
      ])
      const band = await db.bands.get(bandId)
      const snapshotData = JSON.stringify({ band, members, events, tasks, scores, setlists })
      const backup: Backup = {
        id: generateId(),
        bandId,
        timestamp: Date.now(),
        snapshotData,
      }
      await db.backups.add(backup)

      // 只保留最近3条
      const allBackups = await db.backups.where('bandId').equals(bandId).reverse().sortBy('timestamp')
      if (allBackups.length > MAX_BACKUPS) {
        const toDelete = allBackups.slice(MAX_BACKUPS).map(b => b.id)
        await db.backups.bulkDelete(toDelete)
      }

      await get().loadBackups(bandId)
    } catch (e) {
      console.error('Auto backup failed', e)
    }
  },

  exportBackup: async (bandId) => {
    set({ isExporting: true })
    try {
      const [band, members, events, tasks, scores, setlists, fileBlobs] = await Promise.all([
        db.bands.get(bandId),
        db.members.where('bandId').equals(bandId).toArray(),
        db.events.where('bandId').equals(bandId).toArray(),
        db.tasks.where('bandId').equals(bandId).toArray(),
        db.scores.where('bandId').equals(bandId).toArray(),
        db.setlists.where('bandId').equals(bandId).toArray(),
        db.file_blobs.where('bandId').equals(bandId).toArray(),
      ])

      const zip = new JSZip()

      // 元数据
      const metadata = { band, members, events, tasks, scores, setlists }
      zip.file('data.json', JSON.stringify(metadata, null, 2))

      // 二进制文件
      const filesFolder = zip.folder('files')!
      for (const fb of fileBlobs) {
        const ext = fb.fileName.split('.').pop() || 'bin'
        filesFolder.file(`${fb.id}.${ext}`, fb.blob)
      }

      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `bandmanager-backup-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      set({ isExporting: false })
    }
  },

  importBackup: async (file) => {
    set({ isImporting: true })
    try {
      const zip = await JSZip.loadAsync(file)

      const dataFile = zip.file('data.json')
      if (!dataFile) throw new Error('备份文件格式错误：缺少 data.json')

      const jsonStr = await dataFile.async('string')
      const { band, members, events, tasks, scores, setlists } = JSON.parse(jsonStr)

      if (!band?.id) throw new Error('备份数据损坏：缺少乐队信息')

      const bandId = band.id

      // 清空旧数据
      await Promise.all([
        db.members.where('bandId').equals(bandId).delete(),
        db.events.where('bandId').equals(bandId).delete(),
        db.tasks.where('bandId').equals(bandId).delete(),
        db.scores.where('bandId').equals(bandId).delete(),
        db.setlists.where('bandId').equals(bandId).delete(),
        db.file_blobs.where('bandId').equals(bandId).delete(),
      ])

      // 写入元数据
      await db.bands.put(band)
      if (members?.length) await db.members.bulkPut(members)
      if (events?.length) await db.events.bulkPut(events)
      if (tasks?.length) await db.tasks.bulkPut(tasks)
      if (scores?.length) await db.scores.bulkPut(scores)
      if (setlists?.length) await db.setlists.bulkPut(setlists)

      // 恢复二进制文件
      const filesFolder = zip.folder('files')
      if (filesFolder && scores?.length) {
        // 恢复二进制文件
        const filePromises: Promise<void>[] = []
        filesFolder.forEach((relativePath, zipEntry) => {
          filePromises.push((async () => {
            const fileId = relativePath.split('.')[0]
            if (!fileId) return
            const blob = await zipEntry.async('blob')
            const matchScore = scores?.find((s: Score) => s.fileId === fileId)
            await db.file_blobs.put({
              id: fileId,
              bandId,
              fileName: matchScore?.songName ? `${matchScore.songName}.${relativePath.split('.').pop()}` : relativePath,
              fileType: blob.type || 'application/octet-stream',
              fileSize: blob.size,
              blob,
              uploadedAt: Date.now(),
            })
          })())
        })
        await Promise.all(filePromises)
      }
    } finally {
      set({ isImporting: false })
    }
  },

  restoreFromBackup: async (backupId) => {
    const backup = await db.backups.get(backupId)
    if (!backup) throw new Error('备份记录不存在')
    const { band, members, events, tasks, scores, setlists } = JSON.parse(backup.snapshotData)
    const bandId = backup.bandId

    await Promise.all([
      db.members.where('bandId').equals(bandId).delete(),
      db.events.where('bandId').equals(bandId).delete(),
      db.tasks.where('bandId').equals(bandId).delete(),
      db.scores.where('bandId').equals(bandId).delete(),
      db.setlists.where('bandId').equals(bandId).delete(),
    ])

    if (band) await db.bands.put(band)
    if (members?.length) await db.members.bulkPut(members)
    if (events?.length) await db.events.bulkPut(events)
    if (tasks?.length) await db.tasks.bulkPut(tasks)
    if (scores?.length) await db.scores.bulkPut(scores)
    if (setlists?.length) await db.setlists.bulkPut(setlists)
  },

  deleteBackup: async (id) => {
    await db.backups.delete(id)
    set(state => ({ backups: state.backups.filter(b => b.id !== id) }))
  },

  clearBandData: async (bandId) => {
    await Promise.all([
      db.members.where('bandId').equals(bandId).delete(),
      db.events.where('bandId').equals(bandId).delete(),
      db.tasks.where('bandId').equals(bandId).delete(),
      db.scores.where('bandId').equals(bandId).delete(),
      db.setlists.where('bandId').equals(bandId).delete(),
      db.file_blobs.where('bandId').equals(bandId).delete(),
      db.backups.where('bandId').equals(bandId).delete(),
    ])
  },
}))

