// 云端同步服务 - 使用 GitHub Gist 作为免费存储
// 每个乐队对应一个 Gist，数据加密存储

import { db } from './db'
import type { Band, Member, BandEvent, Task, Score, Setlist, FileBlob } from '@/types'

const GIST_API = 'https://api.github.com/gists'

interface SyncConfig {
  githubToken: string
  gistId?: string
  lastSyncAt?: number
}

interface SyncData {
  bands: Band[]
  members: Member[]
  events: BandEvent[]
  tasks: Task[]
  scores: Score[]
  setlists: Setlist[]
  // 文件元数据（不包含 blob，只存文件名和ID）
  fileMeta: { id: string; bandId: string; fileName: string; fileType: string; fileSize: number; uploadedAt: number }[]
  version: number
  updatedAt: number
}

// 简单的 XOR 加密（基础保护，非高强度加密）
// 使用 Uint8Array 处理 Unicode 字符
function encrypt(data: string, key: string): string {
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(data)
  const keyBytes = encoder.encode(key)
  const result = new Uint8Array(dataBytes.length)
  
  for (let i = 0; i < dataBytes.length; i++) {
    result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  
  // 转换为 base64
  const binary = Array.from(result, byte => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

function decrypt(encrypted: string, key: string): string {
  const binary = atob(encrypted)
  const encryptedBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    encryptedBytes[i] = binary.charCodeAt(i)
  }
  
  const keyBytes = new TextEncoder().encode(key)
  const result = new Uint8Array(encryptedBytes.length)
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    result[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
  }
  
  return new TextDecoder().decode(result)
}

// 生成同步密钥（基于 GitHub Token 和乐队ID）
function generateSyncKey(token: string, bandId: string): string {
  return token.slice(0, 16) + bandId.slice(-16)
}

class SyncService {
  private config: SyncConfig | null = null

  // 加载同步配置
  loadConfig(): SyncConfig | null {
    const stored = localStorage.getItem('bandmanager_sync_config')
    if (stored) {
      this.config = JSON.parse(stored)
      return this.config
    }
    return null
  }

  // 保存同步配置
  saveConfig(config: SyncConfig) {
    this.config = config
    localStorage.setItem('bandmanager_sync_config', JSON.stringify(config))
  }

  // 清除同步配置
  clearConfig() {
    this.config = null
    localStorage.removeItem('bandmanager_sync_config')
  }

  // 获取所有数据用于同步
  async getAllSyncData(): Promise<SyncData> {
    const [bands, members, events, tasks, scores, setlists, fileBlobs] = await Promise.all([
      db.bands.toArray(),
      db.members.toArray(),
      db.events.toArray(),
      db.tasks.toArray(),
      db.scores.toArray(),
      db.setlists.toArray(),
      db.file_blobs.toArray(),
    ])

    return {
      bands,
      members,
      events,
      tasks,
      scores,
      setlists,
      fileMeta: fileBlobs.map(f => ({
        id: f.id,
        bandId: f.bandId,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        uploadedAt: f.uploadedAt,
      })),
      version: 1,
      updatedAt: Date.now(),
    }
  }

  // 上传数据到 Gist
  async uploadToCloud(bandId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.githubToken) {
      return { success: false, error: '未配置 GitHub Token' }
    }

    try {
      const syncData = await this.getAllSyncData()
      const key = generateSyncKey(this.config.githubToken, bandId)
      const encrypted = encrypt(JSON.stringify(syncData), key)

      const gistData = {
        description: `BandManager 同步数据 - ${bandId}`,
        public: false,
        files: {
          'bandmanager-sync.json': {
            content: encrypted,
          },
        },
      }

      let response
      if (this.config.gistId) {
        // 更新现有 Gist
        response = await fetch(`${GIST_API}/${this.config.gistId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `token ${this.config.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gistData),
        })
      } else {
        // 创建新 Gist
        response = await fetch(GIST_API, {
          method: 'POST',
          headers: {
            Authorization: `token ${this.config.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gistData),
        })
      }

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `GitHub API 错误: ${error}` }
      }

      const result = await response.json()
      this.config.gistId = result.id
      this.config.lastSyncAt = Date.now()
      this.saveConfig(this.config)

      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }

  // 从 Gist 下载数据
  async downloadFromCloud(bandId: string): Promise<{ success: boolean; data?: SyncData; error?: string }> {
    if (!this.config?.githubToken || !this.config.gistId) {
      return { success: false, error: '未配置同步' }
    }

    try {
      const response = await fetch(`${GIST_API}/${this.config.gistId}`, {
        headers: {
          Authorization: `token ${this.config.githubToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `GitHub API 错误: ${error}` }
      }

      const gist = await response.json()
      const encrypted = gist.files['bandmanager-sync.json']?.content

      if (!encrypted) {
        return { success: false, error: 'Gist 中没有同步数据' }
      }

      const key = generateSyncKey(this.config.githubToken, bandId)
      const decrypted = decrypt(encrypted, key)
      const data: SyncData = JSON.parse(decrypted)

      this.config.lastSyncAt = Date.now()
      this.saveConfig(this.config)

      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }

  // 将云端数据恢复到本地数据库
  async restoreToLocal(data: SyncData): Promise<{ success: boolean; error?: string }> {
    try {
      // 清空现有数据
      await Promise.all([
        db.bands.clear(),
        db.members.clear(),
        db.events.clear(),
        db.tasks.clear(),
        db.scores.clear(),
        db.setlists.clear(),
        db.file_blobs.clear(),
      ])

      // 恢复数据
      await Promise.all([
        db.bands.bulkAdd(data.bands),
        db.members.bulkAdd(data.members),
        db.events.bulkAdd(data.events),
        db.tasks.bulkAdd(data.tasks),
        db.scores.bulkAdd(data.scores),
        db.setlists.bulkAdd(data.setlists),
      ])

      // 文件需要重新上传，这里只记录元数据
      // 实际文件需要用户重新上传

      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }

  // 自动同步（数据变更时调用）
  async autoSync(bandId: string): Promise<void> {
    const config = this.loadConfig()
    if (!config?.githubToken) return

    // 延迟执行，避免频繁同步
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }

    this.syncTimeout = setTimeout(() => {
      this.uploadToCloud(bandId)
    }, 5000) // 5秒后同步
  }

  private syncTimeout: ReturnType<typeof setTimeout> | null = null
}

export const syncService = new SyncService()
export type { SyncConfig, SyncData }
