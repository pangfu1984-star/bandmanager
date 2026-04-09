import { useEffect, useState } from 'react'
import { useBackupStore } from '@/store/useBackupStore'
import { useBandStore } from '@/store/useBandStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingOverlay } from '@/components/Spinner'
import { formatDate } from '@/lib/utils'
import { Download, Upload, RotateCcw, Trash2, Shield, Clock, AlertTriangle } from 'lucide-react'
import type { Backup } from '@/types'

export function BackupPage() {
  const { backups, loadBackups, exportBackup, importBackup, restoreFromBackup, deleteBackup, clearBandData, isExporting, isImporting } = useBackupStore()
  const { currentBandId } = useBandStore()
  const { can } = usePermission()
  const { toast } = useToast()

  const [showClear, setShowClear] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)

  useEffect(() => {
    loadBackups(currentBandId)
  }, [currentBandId])

  if (!can('manage_backup')) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-3 text-gray-200" />
          <p>仅管理员可操作数据备份</p>
        </div>
      </div>
    )
  }

  async function doExport() {
    try {
      await exportBackup(currentBandId)
      toast.success('备份文件已导出')
    } catch (e) {
      toast.error('导出失败：' + (e as Error).message)
    }
  }

  function handleImportSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.zip')) { toast.error('请选择 .zip 备份文件'); return }
    setPendingImportFile(file)
    setShowImportConfirm(true)
    e.target.value = ''
  }

  async function doImport() {
    if (!pendingImportFile) return
    try {
      await importBackup(pendingImportFile)
      toast.success('备份恢复成功！请刷新页面')
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      toast.error('导入失败：' + (e as Error).message)
    } finally {
      setPendingImportFile(null)
      setShowImportConfirm(false)
    }
  }

  async function doRestore(backup: Backup) {
    try {
      await restoreFromBackup(backup.id)
      toast.success('已恢复到该备份！请刷新页面')
      setRestoreTarget(null)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      toast.error('恢复失败：' + (e as Error).message)
    }
  }

  async function doClear() {
    try {
      await clearBandData(currentBandId)
      toast.success('数据已清空！请刷新页面')
      setShowClear(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      toast.error('清空失败：' + (e as Error).message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <LoadingOverlay show={isExporting} text="正在导出备份..." />
      <LoadingOverlay show={isImporting} text="正在导入备份..." />

      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
        <Shield className="w-6 h-6 text-blue-500" />
        数据备份与恢复
      </h1>

      {/* 导出 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-500" />
          导出完整备份
        </h2>
        <p className="text-sm text-gray-500 mb-4">将当前乐队所有数据（含元数据和文件）打包为 ZIP 文件，可跨设备导入恢复。</p>
        <button
          onClick={doExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          <Download className="w-4 h-4" />
          下载备份 ZIP
        </button>
      </div>

      {/* 导入 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-500" />
          导入备份文件
        </h2>
        <p className="text-sm text-gray-500 mb-4">选择之前导出的 ZIP 备份文件，自动恢复所有数据（将覆盖当前数据）。</p>
        <label
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-green-600 border border-green-200 hover:bg-green-50 rounded-lg cursor-pointer inline-flex"
          style={{ minHeight: 44 }}
        >
          <Upload className="w-4 h-4" />
          选择备份文件
          <input type="file" accept=".zip" onChange={handleImportSelect} className="hidden" />
        </label>
      </div>

      {/* 本地备份记录 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            本地自动备份
            <span className="text-sm text-gray-400 font-normal">（最近3条）</span>
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">每次数据变更后自动生成快照，注意：自动备份不含文件，仅含元数据</p>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">暂无自动备份记录</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {backups.map((backup, i) => (
              <div key={backup.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    备份 #{backups.length - i}
                    {i === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">最新</span>}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(backup.timestamp)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRestoreTarget(backup)}
                    className="flex items-center gap-1 text-xs text-orange-500 border border-orange-200 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg"
                    style={{ minHeight: 44 }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    回滚
                  </button>
                  <button
                    onClick={async () => { await deleteBackup(backup.id); toast.success('备份已删除') }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 危险区域 */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-700 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          危险区域
        </h2>
        <p className="text-sm text-red-600 mb-4">清空当前乐队所有数据，包括成员、日程、任务、乐谱和歌单。此操作不可撤销！</p>
        <button
          onClick={() => setShowClear(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
          style={{ minHeight: 44 }}
        >
          <Trash2 className="w-4 h-4" />
          清空所有数据
        </button>
      </div>

      <ConfirmDialog
        isOpen={showImportConfirm}
        title="导入备份确认"
        message={`导入将覆盖当前乐队的所有数据，是否继续？文件: ${pendingImportFile?.name}`}
        confirmText="确认导入"
        onConfirm={doImport}
        onCancel={() => { setShowImportConfirm(false); setPendingImportFile(null) }}
        danger
      />

      <ConfirmDialog
        isOpen={!!restoreTarget}
        title="回滚确认"
        message={`确定要回滚到 ${restoreTarget ? formatDate(restoreTarget.timestamp) : ''} 的备份吗？当前数据将被覆盖。`}
        confirmText="确认回滚"
        onConfirm={() => restoreTarget && doRestore(restoreTarget)}
        onCancel={() => setRestoreTarget(null)}
        danger
      />

      <ConfirmDialog
        isOpen={showClear}
        title="⚠️ 清空所有数据"
        message="此操作非常危险，将永久删除当前乐队所有数据（含文件），不可恢复。确定要继续吗？"
        confirmText="我确认清空"
        onConfirm={doClear}
        onCancel={() => setShowClear(false)}
        danger
      />
    </div>
  )
}
