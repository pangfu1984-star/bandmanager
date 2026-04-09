import { useState, useEffect } from 'react'
import { useScoreStore } from '@/store/useScoreStore'
import { useFileStore, getBandStorageUsed, BAND_STORAGE_LIMIT } from '@/store/useFileStore'
import { useBandStore } from '@/store/useBandStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { FileUploader } from '@/components/FileUploader'
import { Pagination } from '@/components/Pagination'
import { Spinner } from '@/components/Spinner'
import { PART_TYPE_LABELS } from '@/lib/constants'
import { formatDate, formatFileSize, ALLOWED_SCORE_TYPES, escapeHtml } from '@/lib/utils'
import { formatFileSize as fmt } from '@/lib/utils'
import { Music, Upload, Search, Grid, List, Download, Trash2, Edit2, X, Tag, Play, Eye } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { Score, PartType, ViewMode } from '@/types'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const PAGE_SIZE = 20

interface ScoreFormData {
  songName: string
  key: string
  instrument: string
  partType: PartType
  tags: string
}

export function ScoresPage() {
  const { scores, createScore, updateScore, deleteScore, searchScores } = useScoreStore()
  const { uploadFile, deleteFile, getFileUrl, isUploading } = useFileStore()
  const { currentBandId } = useBandStore()
  const { can } = usePermission()
  const { toast } = useToast()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'uploadedAt' | 'songName'>('uploadedAt')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile2, setUploadFile2] = useState<File | null>(null)
  const [form, setForm] = useState<ScoreFormData>({ songName: '', key: '', instrument: '', partType: 'main', tags: '' })
  const [editingScore, setEditingScore] = useState<Score | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Score | null>(null)
  const [previewScore, setPreviewScore] = useState<Score | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [storageUsed, setStorageUsed] = useState(0)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [pdfPage, setPdfPage] = useState(1)

  useEffect(() => {
    getBandStorageUsed(currentBandId).then(setStorageUsed)
  }, [scores, currentBandId])

  useEffect(() => {
    if (previewScore) {
      getFileUrl(previewScore.fileId).then(url => setPreviewUrl(url))
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewScore])

  const filtered = searchQuery
    ? searchScores(currentBandId, searchQuery)
    : scores.filter(s => s.bandId === currentBandId)

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'uploadedAt' ? b.uploadedAt - a.uploadedAt : a.songName.localeCompare(b.songName)
  )

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function doUpload() {
    if (!uploadFile2) { toast.error('请选择文件'); return }
    if (!form.songName.trim()) { toast.error('请填写歌曲名'); return }
    try {
      const fb = await uploadFile(currentBandId, uploadFile2)
      await createScore({
        bandId: currentBandId,
        fileId: fb.id,
        songName: escapeHtml(form.songName.trim()),
        key: escapeHtml(form.key),
        instrument: escapeHtml(form.instrument),
        partType: form.partType,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('乐谱上传成功')
      setShowUpload(false)
      setUploadFile2(null)
      setForm({ songName: '', key: '', instrument: '', partType: 'main', tags: '' })
      const used = await getBandStorageUsed(currentBandId)
      setStorageUsed(used)
    } catch (e) {
      toast.error('上传失败：' + (e as Error).message)
    }
  }

  async function doSaveEdit() {
    if (!editingScore) return
    try {
      await updateScore(editingScore.id, {
        songName: escapeHtml(form.songName.trim()),
        key: escapeHtml(form.key),
        instrument: escapeHtml(form.instrument),
        partType: form.partType,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('乐谱信息已更新')
      setEditingScore(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    try {
      await deleteFile(deleteTarget.fileId)
      await deleteScore(deleteTarget.id)
      toast.success('乐谱已删除')
      setDeleteTarget(null)
      const used = await getBandStorageUsed(currentBandId)
      setStorageUsed(used)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function doDownload(score: Score) {
    const url = await getFileUrl(score.fileId)
    if (!url) { toast.error('文件不存在'); return }
    const a = document.createElement('a')
    a.href = url
    a.download = score.songName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const storagePercent = Math.min((storageUsed / BAND_STORAGE_LIMIT) * 100, 100)

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">乐谱库</h1>
          {can('manage_scores') && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg"
              style={{ minHeight: 44 }}
            >
              <Upload className="w-4 h-4" />
              上传乐谱
            </button>
          )}
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="搜索歌曲名、乐器、调式、标签..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              style={{ minHeight: 44 }}
            />
          </div>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'uploadedAt' | 'songName')}
            style={{ minHeight: 44 }}
          >
            <option value="uploadedAt">最新上传</option>
            <option value="songName">歌曲名</option>
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`px-2.5 ${viewMode === 'list' ? 'bg-blue-50 text-blue-500' : 'text-gray-400'}`} style={{ minHeight: 44, minWidth: 44 }}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`px-2.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-500' : 'text-gray-400'}`} style={{ minHeight: 44, minWidth: 44 }}>
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 存储进度 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${storagePercent}%` }} />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{fmt(storageUsed)} / 500MB</span>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {paged.length === 0 ? (
          <EmptyState
            icon={<Music className="w-12 h-12 text-gray-300" />}
            title="暂无乐谱"
            description="点击右上角上传乐谱"
          />
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {paged.map(score => <ScoreListItem key={score.id} score={score} onPreview={() => setPreviewScore(score)} onDownload={() => doDownload(score)} onEdit={() => { setEditingScore(score); setForm({ songName: score.songName, key: score.key, instrument: score.instrument, partType: score.partType, tags: score.tags.join(', ') }) }} onDelete={() => setDeleteTarget(score)} canManage={can('manage_scores')} />)}
            <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {paged.map(score => <ScoreGridItem key={score.id} score={score} onPreview={() => setPreviewScore(score)} onDownload={() => doDownload(score)} onEdit={() => { setEditingScore(score); setForm({ songName: score.songName, key: score.key, instrument: score.instrument, partType: score.partType, tags: score.tags.join(', ') }) }} onDelete={() => setDeleteTarget(score)} canManage={can('manage_scores')} />)}
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">上传乐谱</h3>
              <button onClick={() => setShowUpload(false)} className="p-2 text-gray-400" style={{ minWidth: 44, minHeight: 44 }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <FileUploader
                allowedTypes={ALLOWED_SCORE_TYPES}
                onFileSelect={setUploadFile2}
                label="点击或拖拽上传（PDF/图片/音频）"
              />
              {uploadFile2 && (
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  已选择：{uploadFile2.name} ({formatFileSize(uploadFile2.size)})
                </p>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">歌曲名 *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} style={{ minHeight: 44 }} placeholder="歌曲名称" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">调式</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} style={{ minHeight: 44 }} placeholder="如 C大调" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">乐器</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} style={{ minHeight: 44 }} placeholder="如 吉他" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">谱子类型</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" value={form.partType} onChange={e => setForm(f => ({ ...f, partType: e.target.value as PartType }))} style={{ minHeight: 44 }}>
                  {Object.entries(PART_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">标签（逗号分隔）</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={{ minHeight: 44 }} placeholder="如 原创, 摇滚, 翻唱" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={doUpload} disabled={isUploading || !uploadFile2} className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50" style={{ minHeight: 44 }}>
                {isUploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingScore && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">编辑乐谱信息</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">歌曲名 *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} style={{ minHeight: 44 }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">调式</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} style={{ minHeight: 44 }} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">乐器</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} style={{ minHeight: 44 }} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">谱子类型</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.partType} onChange={e => setForm(f => ({ ...f, partType: e.target.value as PartType }))} style={{ minHeight: 44 }}>
                  {Object.entries(PART_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">标签</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={{ minHeight: 44 }} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditingScore(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={doSaveEdit} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg" style={{ minHeight: 44 }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {previewScore && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/50">
            <h3 className="text-white font-medium">{previewScore.songName}</h3>
            <button onClick={() => setPreviewScore(null)} className="p-2 text-white" style={{ minWidth: 44, minHeight: 44 }}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {!previewUrl ? (
              <Spinner text="加载中..." />
            ) : previewScore.fileType === 'application/pdf' ? (
              <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full">
                <Document
                  file={previewUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<Spinner text="加载PDF中..." />}
                >
                  {Array.from({ length: Math.min(pdfPage, numPages > 0 ? Math.min(numPages, 3) : 3) }, (_, i) => (
                    <Page key={i + 1} pageNumber={i + 1} width={Math.min(window.innerWidth - 32, 600)} />
                  ))}
                </Document>
                {numPages > 3 && (
                  <div className="flex items-center justify-center gap-4 p-3 border-t">
                    <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage === 1} className="px-3 py-1.5 text-sm bg-gray-100 rounded disabled:opacity-40" style={{ minHeight: 44 }}>上一页</button>
                    <span className="text-sm text-gray-500">{pdfPage} / {numPages}</span>
                    <button onClick={() => setPdfPage(p => Math.min(numPages, p + 1))} disabled={pdfPage === numPages} className="px-3 py-1.5 text-sm bg-gray-100 rounded disabled:opacity-40" style={{ minHeight: 44 }}>下一页</button>
                  </div>
                )}
              </div>
            ) : previewScore.fileType.startsWith('image/') ? (
              <img src={previewUrl} alt={previewScore.songName} className="max-w-full max-h-full object-contain rounded-lg" />
            ) : previewScore.fileType.startsWith('audio/') ? (
              <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
                <Play className="w-16 h-16 text-blue-400" />
                <p className="text-gray-700 font-medium">{previewScore.songName}</p>
                <audio controls src={previewUrl} className="w-full max-w-sm" />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除乐谱"
        message={`确定要删除乐谱「${deleteTarget?.songName}」吗？文件将永久删除。`}
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}

// 子组件
function ScoreListItem({ score, onPreview, onDownload, onEdit, onDelete, canManage }: {
  score: Score
  onPreview: () => void
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
  canManage: boolean
}) {
  const iconBg = score.fileType === 'application/pdf' ? 'bg-red-50 text-red-400' :
    score.fileType?.startsWith('image/') ? 'bg-green-50 text-green-400' : 'bg-purple-50 text-purple-400'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Music className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{score.songName}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {score.key && <span className="text-xs text-gray-400">{score.key}</span>}
          {score.instrument && <span className="text-xs text-gray-400">· {score.instrument}</span>}
          <span className="text-xs text-gray-400">· {PART_TYPE_LABELS[score.partType]}</span>
          <span className="text-xs text-gray-300">{formatDate(score.uploadedAt, 'date')}</span>
        </div>
        {score.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {score.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onPreview} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" style={{ minWidth: 44, minHeight: 44 }} title="预览"><Eye className="w-4 h-4" /></button>
        <button onClick={onDownload} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg" style={{ minWidth: 44, minHeight: 44 }} title="下载"><Download className="w-4 h-4" /></button>
        {canManage && <>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" style={{ minWidth: 44, minHeight: 44 }}><Edit2 className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" style={{ minWidth: 44, minHeight: 44 }}><Trash2 className="w-4 h-4" /></button>
        </>}
      </div>
    </div>
  )
}

function ScoreGridItem({ score, onPreview, onDownload, onEdit, onDelete, canManage }: {
  score: Score
  onPreview: () => void
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
  canManage: boolean
}) {
  const iconBg = score.fileType === 'application/pdf' ? 'bg-red-50' :
    score.fileType?.startsWith('image/') ? 'bg-green-50' : 'bg-purple-50'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className={`h-24 ${iconBg} flex items-center justify-center cursor-pointer`}
        onClick={onPreview}
      >
        <Music className="w-10 h-10 text-gray-300" />
      </div>
      <div className="p-3">
        <p className="font-medium text-gray-900 text-sm truncate">{score.songName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{PART_TYPE_LABELS[score.partType]}</p>
        <div className="flex items-center gap-1 mt-2">
          <button onClick={onPreview} className="flex-1 py-1.5 text-xs text-blue-500 border border-blue-100 rounded hover:bg-blue-50" style={{ minHeight: 44 }}>预览</button>
          <button onClick={onDownload} className="p-1.5 text-gray-400 hover:text-green-500" style={{ minWidth: 44, minHeight: 44 }}><Download className="w-3.5 h-3.5" /></button>
          {canManage && <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500" style={{ minWidth: 44, minHeight: 44 }}><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
    </div>
  )
}
