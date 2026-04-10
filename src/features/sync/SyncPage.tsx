import { useState, useEffect } from 'react'
import { useBandStore } from '@/store/useBandStore'
import { syncService, type SyncConfig } from '@/lib/syncService'
import { useBackupStore } from '@/store/useBackupStore'
import { useToast } from '@/hooks/useToast'
import { usePermission } from '@/hooks/usePermission'
import { Cloud, CloudOff, Upload, Download, Settings, Check, AlertCircle, Copy, Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react'

export function SyncPage() {
  const { currentBandId, getCurrentBand } = useBandStore()
  const { toast } = useToast()
  const { can, isAdmin } = usePermission()
  const canUpload = can('manage_backup')
  const { createAutoBackup } = useBackupStore()
  const band = getCurrentBand()

  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [uploadPassword, setUploadPassword] = useState('')
  const [showUploadPassword, setShowUploadPassword] = useState(false)

  useEffect(() => {
    const loaded = syncService.loadConfig()
    if (loaded) {
      setConfig(loaded)
      setToken(loaded.githubToken)
    }
  }, [])

  const handleSaveConfig = () => {
    if (!token.trim()) {
      toast.error('请输入 GitHub Token')
      return
    }
    syncService.saveConfig({ githubToken: token })
    setConfig({ githubToken: token })
    setShowSettings(false)
    toast.success('配置已保存')
  }

  const handleClearConfig = () => {
    syncService.clearConfig()
    setConfig(null)
    setToken('')
    toast.success('配置已清除')
  }

  const handleCopyToken = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Token 已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleUploadClick = () => {
    if (!currentBandId) {
      toast.error('请先选择乐队')
      return
    }
    // 如果设置了管理员密码，需要先验证
    if (band?.adminPassword) {
      setUploadPassword('')
      setShowPasswordDialog(true)
      return
    }
    // 没有设置密码直接上传
    doUpload()
  }

  const verifyUploadPassword = () => {
    if (uploadPassword === band?.adminPassword) {
      setShowPasswordDialog(false)
      setUploadPassword('')
      doUpload()
    } else {
      toast.error('密码错误')
    }
  }

  const doUpload = async () => {
    if (!currentBandId) return
    setIsLoading(true)
    // 上传前自动在本地创建一次快照备份，保护历史数据
    await createAutoBackup(currentBandId)
    const result = await syncService.uploadToCloud(currentBandId)
    setIsLoading(false)
    if (result.success) {
      toast.success('数据已同步到云端（本地已自动备份）')
      setConfig(syncService.loadConfig())
    } else {
      toast.error('同步失败: ' + result.error)
    }
  }

  const handleDownload = async () => {
    if (!currentBandId) {
      toast.error('请先选择乐队')
      return
    }
    setShowDownloadConfirm(false)
    setIsLoading(true)
    // 下载覆盖前先备份当前本地数据
    await createAutoBackup(currentBandId)
    const result = await syncService.downloadFromCloud(currentBandId)
    if (result.success && result.data) {
      const restore = await syncService.restoreToLocal(result.data)
      setIsLoading(false)
      if (restore.success) {
        toast.success('已从云端恢复数据，请刷新页面（原数据已备份）')
      } else {
        toast.error('恢复失败: ' + restore.error)
      }
    } else {
      setIsLoading(false)
      toast.error('下载失败: ' + result.error)
    }
  }

  const isConfigured = !!config?.githubToken

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Cloud className="w-6 h-6 text-blue-500" />
        云端同步
      </h1>

      {!band && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700">请先选择或创建一个乐队</p>
        </div>
      )}

      {/* 状态卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <Cloud className="w-10 h-10 text-green-500" />
            ) : (
              <CloudOff className="w-10 h-10 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {isConfigured ? '已配置云端同步' : '未配置云端同步'}
              </p>
              <p className="text-sm text-gray-500">
                {config?.lastSyncAt
                  ? `上次同步: ${new Date(config.lastSyncAt).toLocaleString()}`
                  : '尚未同步'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">同步设置</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                GitHub Personal Access Token
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {token && (
                  <button
                    onClick={handleCopyToken}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm"
                    title="复制 Token"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                在 GitHub Settings → Developer settings → Personal access tokens 中生成
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveConfig}
                className="flex-1 bg-blue-500 text-white text-sm py-2 rounded-lg hover:bg-blue-600"
              >
                保存
              </button>
              {isConfigured && (
                <button
                  onClick={handleClearConfig}
                  className="px-4 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-3">
        {/* 上传按钮：仅管理员可操作 */}
        {canUpload ? (
          <button
            onClick={handleUploadClick}
            disabled={!isConfigured || !band || isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            {isLoading ? '同步中...' : '上传数据到云端'}
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-3 rounded-xl cursor-not-allowed border border-gray-200">
            <Lock className="w-5 h-5" />
            <span>上传数据（仅管理员）</span>
          </div>
        )}

        <button
          onClick={() => setShowDownloadConfirm(true)}
          disabled={!isConfigured || !band || isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          从云端获取最新数据
        </button>
      </div>

      {/* 下载二次确认弹窗 */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900">确认从云端覆盖数据？</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              此操作会用云端数据<strong>覆盖</strong>本地数据。当前本地数据将自动备份，但仍建议确认后再操作。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDownloadConfirm(false)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-xl hover:bg-blue-600"
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 权限说明 */}
      {!isAdmin && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            你当前以<strong>普通成员</strong>身份登录，只能从云端获取数据，无法上传覆盖云端数据。如需上传，请联系管理员。
          </p>
        </div>
      )}

      {/* 说明 */}
      <div className="mt-4 text-sm text-gray-500 space-y-2">
        <p className="font-medium text-gray-700">使用说明：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>数据存储在 GitHub Gist（私有）</li>
          <li>仅<strong>管理员</strong>可上传数据到云端</li>
          <li>普通成员只能从云端获取（只读同步）</li>
          <li>乐谱文件需要重新上传（只同步元数据）</li>
        </ul>
      </div>

      {/* 上传密码验证弹窗 */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">验证管理员密码</h3>
                <p className="text-sm text-gray-500">上传数据到云端</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">管理员密码</label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showUploadPassword ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-10"
                    value={uploadPassword}
                    onChange={(e) => setUploadPassword(e.target.value)}
                    style={{ minHeight: 44 }}
                    placeholder="请输入管理员密码"
                    onKeyDown={(e) => e.key === 'Enter' && verifyUploadPassword()}
                  />
                  <button
                    onClick={() => setShowUploadPassword(!showUploadPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showUploadPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => { setShowPasswordDialog(false); setUploadPassword('') }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                style={{ minHeight: 44 }}
              >
                取消
              </button>
              <button
                onClick={verifyUploadPassword}
                className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
                style={{ minHeight: 44 }}
              >
                验证并上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
