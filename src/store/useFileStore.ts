import { create } from 'zustand'
import { db, getBandStorageUsed, BAND_STORAGE_LIMIT, generateId } from '@/lib/db'
import type { FileBlob } from '@/types'
import { formatFileSize } from '@/lib/utils'

export { getBandStorageUsed, BAND_STORAGE_LIMIT }

interface FileState {
  isUploading: boolean
  uploadFile: (bandId: string, file: File) => Promise<FileBlob>
  getFile: (fileId: string) => Promise<FileBlob | undefined>
  deleteFile: (fileId: string) => Promise<void>
  getFileUrl: (fileId: string) => Promise<string | null>
  getBandFiles: (bandId: string) => Promise<FileBlob[]>
}

export const useFileStore = create<FileState>((set) => ({
  isUploading: false,

  uploadFile: async (bandId, file) => {
    set({ isUploading: true })
    try {
      const used = await getBandStorageUsed(bandId)
      if (used + file.size > BAND_STORAGE_LIMIT) {
        throw new Error(`存储空间不足，当前已用 ${formatFileSize(used)}，上限 500MB`)
      }
      const fileBlob: FileBlob = {
        id: generateId(),
        bandId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blob: file,
        uploadedAt: Date.now(),
      }
      await db.file_blobs.add(fileBlob)
      return fileBlob
    } finally {
      set({ isUploading: false })
    }
  },

  getFile: async (fileId) => {
    return db.file_blobs.get(fileId)
  },

  deleteFile: async (fileId) => {
    await db.file_blobs.delete(fileId)
  },

  getFileUrl: async (fileId) => {
    const fileBlob = await db.file_blobs.get(fileId)
    if (!fileBlob) return null
    return URL.createObjectURL(fileBlob.blob)
  },

  getBandFiles: async (bandId) => {
    return db.file_blobs.where('bandId').equals(bandId).toArray()
  }
}))
