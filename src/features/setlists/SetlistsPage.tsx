import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSetlistStore } from '@/store/useSetlistStore'
import { useScoreStore } from '@/store/useScoreStore'
import { useBandStore } from '@/store/useBandStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PART_TYPE_LABELS } from '@/lib/constants'
import { formatDate, escapeHtml } from '@/lib/utils'
import { jsPDF } from 'jspdf'
import { Plus, Trash2, Edit2, GripVertical, Music, Download, X, List, ChevronRight } from 'lucide-react'
import type { Setlist, SetlistSong, PartType } from '@/types'

export function SetlistsPage() {
  const { setlists, createSetlist, updateSetlist, deleteSetlist, addSongToSetlist, removeSongFromSetlist, reorderSongs, updateSongNotes } = useSetlistStore()
  const { scores } = useScoreStore()
  const { currentBandId } = useBandStore()
  const { can } = usePermission()
  const { toast } = useToast()

  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [deleteTarget, setDeleteTarget] = useState<Setlist | null>(null)
  const [showAddSong, setShowAddSong] = useState(false)
  const [editingNotesSongId, setEditingNotesSongId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  const bandSetlists = setlists.filter(s => s.bandId === currentBandId)
  const bandScores = scores.filter(s => s.bandId === currentBandId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function doCreate() {
    if (!createForm.name.trim()) { toast.error('请填写歌单名称'); return }
    try {
      const sl = await createSetlist({
        bandId: currentBandId,
        name: escapeHtml(createForm.name.trim()),
        description: escapeHtml(createForm.description),
        songs: [],
      })
      toast.success('歌单已创建')
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
      setSelectedSetlist(sl)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    try {
      await deleteSetlist(deleteTarget.id)
      toast.success('歌单已删除')
      if (selectedSetlist?.id === deleteTarget.id) setSelectedSetlist(null)
      setDeleteTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleDragEnd(event: DragEndEvent, setlist: Setlist) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = setlist.songs.findIndex(s => s.scoreId === active.id)
    const newIndex = setlist.songs.findIndex(s => s.scoreId === over.id)
    const reordered = arrayMove(setlist.songs, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
    await reorderSongs(setlist.id, reordered)
    // 更新本地 selectedSetlist
    setSelectedSetlist({ ...setlist, songs: reordered })
  }

  async function doAddSong(scoreId: string) {
    if (!selectedSetlist) return
    if (selectedSetlist.songs.find(s => s.scoreId === scoreId)) {
      toast.warning('该乐谱已在歌单中')
      return
    }
    try {
      await addSongToSetlist(selectedSetlist.id, { scoreId, order: selectedSetlist.songs.length, notes: '' })
      const updated = setlists.find(s => s.id === selectedSetlist.id)
      if (updated) setSelectedSetlist(updated)
      toast.success('已添加到歌单')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function doRemoveSong(setlistId: string, scoreId: string) {
    try {
      await removeSongFromSetlist(setlistId, scoreId)
      const updated = setlists.find(s => s.id === setlistId)
      if (updated) setSelectedSetlist(updated)
      toast.success('已从歌单移除')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function saveNotes(setlistId: string, scoreId: string) {
    try {
      await updateSongNotes(setlistId, scoreId, escapeHtml(notesValue))
      const updated = setlists.find(s => s.id === setlistId)
      if (updated) setSelectedSetlist(updated)
      setEditingNotesSongId(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function exportPdf(setlist: Setlist) {
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text(setlist.name, 20, 20)
      if (setlist.description) {
        doc.setFontSize(12)
        doc.text(setlist.description, 20, 30)
      }
      doc.setFontSize(14)
      doc.text('歌曲列表', 20, 45)

      let y = 55
      setlist.songs.forEach((song, i) => {
        const score = bandScores.find(s => s.scoreId === song.scoreId) ??
          scores.find(s => s.id === song.scoreId)
        const name = score?.songName ?? '未知歌曲'
        doc.setFontSize(12)
        doc.text(`${i + 1}. ${name}`, 20, y)
        y += 8
        if (song.notes) {
          doc.setFontSize(10)
          doc.setTextColor(120, 120, 120)
          doc.text(`  备注: ${song.notes}`, 20, y)
          doc.setTextColor(0, 0, 0)
          y += 7
        }
        if (y > 270) {
          doc.addPage()
          y = 20
        }
      })
      doc.save(`${setlist.name}.pdf`)
      toast.success('PDF已导出')
    } catch (e) {
      toast.error('导出失败：' + (e as Error).message)
    }
  }

  function exportJson(setlist: Setlist) {
    const data = {
      ...setlist,
      songs: setlist.songs.map(song => ({
        ...song,
        scoreInfo: scores.find(s => s.id === song.scoreId),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${setlist.name}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('JSON已导出')
  }

  // 如果有选中的歌单，从 store 同步最新数据
  const currentSetlist = selectedSetlist ? setlists.find(s => s.id === selectedSetlist.id) ?? selectedSetlist : null

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* 歌单列表 */}
      <div className={`${currentSetlist ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-gray-100 bg-white flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">歌单管理</h1>
          {can('manage_setlists') && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg" style={{ minHeight: 44 }}>
              <Plus className="w-4 h-4" />
              新建
            </button>
          )}
        </div>

        {bandSetlists.length === 0 ? (
          <EmptyState icon={<List className="w-12 h-12 text-gray-300" />} title="暂无歌单" description="点击右上角新建歌单" />
        ) : (
          <div className="flex-1 overflow-auto divide-y divide-gray-50">
            {bandSetlists.map(sl => (
              <div
                key={sl.id}
                onClick={() => setSelectedSetlist(sl)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  currentSetlist?.id === sl.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{sl.name}</p>
                  <p className="text-xs text-gray-400">{sl.songs.length} 首 · {formatDate(sl.updatedAt, 'date')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 歌单详情 */}
      {currentSetlist ? (
        <div className="flex flex-col flex-1 bg-gray-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
            <button onClick={() => setSelectedSetlist(null)} className="md:hidden p-2 text-gray-400" style={{ minWidth: 44, minHeight: 44 }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{currentSetlist.name}</h2>
              {currentSetlist.description && <p className="text-xs text-gray-400 truncate">{currentSetlist.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => exportPdf(currentSetlist)} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50" style={{ minHeight: 44 }}>
                <Download className="w-3.5 h-3.5" />PDF
              </button>
              <button onClick={() => exportJson(currentSetlist)} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50" style={{ minHeight: 44 }}>
                <Download className="w-3.5 h-3.5" />JSON
              </button>
              {can('manage_setlists') && (
                <button onClick={() => setDeleteTarget(currentSetlist)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" style={{ minWidth: 44, minHeight: 44 }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {/* 添加歌曲按钮 */}
            {can('add_score_to_setlist') && (
              <button onClick={() => setShowAddSong(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 mb-3 transition-colors" style={{ minHeight: 44 }}>
                <Plus className="w-4 h-4" />
                从乐谱库添加歌曲
              </button>
            )}

            {currentSetlist.songs.length === 0 ? (
              <EmptyState icon={<Music className="w-12 h-12 text-gray-300" />} title="歌单为空" description="点击上方按钮添加歌曲" />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, currentSetlist)}>
                <SortableContext items={currentSetlist.songs.map(s => s.scoreId)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {currentSetlist.songs.sort((a, b) => a.order - b.order).map((song, idx) => {
                      const score = scores.find(s => s.id === song.scoreId)
                      return (
                        <SortableSetlistItem
                          key={song.scoreId}
                          song={song}
                          index={idx}
                          score={score}
                          isEditingNotes={editingNotesSongId === song.scoreId}
                          notesValue={notesValue}
                          onEditNotes={() => { setEditingNotesSongId(song.scoreId); setNotesValue(song.notes) }}
                          onSaveNotes={() => saveNotes(currentSetlist.id, song.scoreId)}
                          onNotesChange={setNotesValue}
                          onRemove={() => doRemoveSong(currentSetlist.id, song.scoreId)}
                          canManage={can('add_score_to_setlist')}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <List className="w-16 h-16 mx-auto mb-3 text-gray-200" />
            <p>请选择或创建一个歌单</p>
          </div>
        </div>
      )}

      {/* 新建歌单弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">新建歌单</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">歌单名称 *</label>
                <input autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} style={{ minHeight: 44 }} onKeyDown={e => e.key === 'Enter' && doCreate()} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">描述（可选）</label>
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={doCreate} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg" style={{ minHeight: 44 }}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加歌曲弹窗 */}
      {showAddSong && currentSetlist && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md p-6 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">从乐谱库添加</h3>
              <button onClick={() => setShowAddSong(false)} className="p-2 text-gray-400" style={{ minWidth: 44, minHeight: 44 }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto space-y-2">
              {bandScores.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">乐谱库为空</p>
              ) : bandScores.map(score => {
                const inSetlist = currentSetlist.songs.some(s => s.scoreId === score.id)
                return (
                  <div key={score.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">{score.songName}</p>
                      <p className="text-xs text-gray-400">{PART_TYPE_LABELS[score.partType]}</p>
                    </div>
                    <button
                      onClick={() => doAddSong(score.id)}
                      disabled={inSetlist}
                      className={`text-xs px-3 py-1.5 rounded-lg ${inSetlist ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                      style={{ minHeight: 44 }}
                    >
                      {inSetlist ? '已添加' : '添加'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除歌单"
        message={`确定要删除歌单「${deleteTarget?.name}」吗？`}
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}

// 可拖拽歌曲条目
function SortableSetlistItem({ song, index, score, isEditingNotes, notesValue, onEditNotes, onSaveNotes, onNotesChange, onRemove, canManage }: {
  song: SetlistSong
  index: number
  score: { songName: string; partType: PartType; key: string } | undefined
  isEditingNotes: boolean
  notesValue: string
  onEditNotes: () => void
  onSaveNotes: () => void
  onNotesChange: (v: string) => void
        onRemove: () => void
  canManage: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.scoreId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab p-1 text-gray-300 hover:text-gray-400 flex-shrink-0" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-gray-400 text-sm font-mono w-6 flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900">{score?.songName ?? '已删除的乐谱'}</p>
          {score && <p className="text-xs text-gray-400">{PART_TYPE_LABELS[score.partType]}{score.key ? ` · ${score.key}` : ''}</p>}
          {!isEditingNotes && song.notes && (
            <p className="text-xs text-blue-500 mt-0.5 truncate">备注: {song.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEditNotes} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg" style={{ minWidth: 44, minHeight: 44 }} title="编辑备注">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} className="p-2 text-gray-400 hover:text-red-500 rounded-lg" style={{ minWidth: 44, minHeight: 44 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {isEditingNotes && (
        <div className="mt-2 pl-12">
          <input
            autoFocus
            className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={notesValue}
            onChange={e => onNotesChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSaveNotes()}
            placeholder="添加演奏备注..."
            style={{ minHeight: 44 }}
          />
          <div className="flex gap-2 mt-1.5">
            <button onClick={onSaveNotes} className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg" style={{ minHeight: 44 }}>保存</button>
          </div>
        </div>
      )}
    </div>
  )
}

