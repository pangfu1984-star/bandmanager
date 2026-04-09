import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useEventStore } from '@/store/useEventStore'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@/lib/constants'
import { formatDate, escapeHtml, ALLOWED_EVENT_ATTACHMENT_TYPES } from '@/lib/utils'
import { useFileStore } from '@/store/useFileStore'
import { Plus, X, MapPin, Clock, FileText, Paperclip, ChevronDown } from 'lucide-react'
import type { BandEvent, EventType } from '@/types'

interface EventFormData {
  title: string
  type: EventType
  startTime: string
  endTime: string
  location: string
  notes: string
}

const DEFAULT_FORM: EventFormData = {
  title: '', type: 'rehearsal', startTime: '', endTime: '', location: '', notes: ''
}

function isMobile() {
  return window.innerWidth < 768
}

export function CalendarPage() {
  const { events, createEvent, updateEvent, deleteEvent, getConflicts, getEventById } = useEventStore()
  const { currentBandId } = useBandStore()
  const { currentMemberId } = useMemberStore()
  const { can } = usePermission()
  const { toast } = useToast()
  const { uploadFile, isUploading } = useFileStore()
  const calendarRef = useRef<FullCalendar>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<BandEvent | null>(null)
  const [form, setForm] = useState<EventFormData>(DEFAULT_FORM)
  const [selectedEvent, setSelectedEvent] = useState<BandEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BandEvent | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [pendingSave, setPendingSave] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const calendarEvents = events
    .filter(e => e.bandId === currentBandId)
    .map(e => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      backgroundColor: EVENT_TYPE_COLORS[e.type],
      borderColor: EVENT_TYPE_COLORS[e.type],
      textColor: '#fff',
    }))

  function openCreate(dateStr?: string) {
    if (!can('create_event')) { toast.error('权限不足'); return }
    const now = dateStr ? new Date(dateStr) : new Date()
    const startStr = now.toISOString().slice(0, 16)
    const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const endStr = endDate.toISOString().slice(0, 16)
    setForm({ ...DEFAULT_FORM, startTime: startStr, endTime: endStr })
    setEditingEvent(null)
    setConflictWarning(null)
    setAttachmentFile(null)
    setShowForm(true)
  }

  function openEdit(event: BandEvent) {
    if (!can('edit_any_event', { resourceCreatorId: event.creatorMemberId })) {
      toast.error('权限不足：只能编辑自己创建的日程')
      return
    }
    setForm({
      title: event.title,
      type: event.type,
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: new Date(event.endTime).toISOString().slice(0, 16),
      location: event.location,
      notes: event.notes,
    })
    setEditingEvent(event)
    setConflictWarning(null)
    setAttachmentFile(null)
    setSelectedEvent(null)
    setShowForm(true)
  }

  async function doSave() {
    const startTime = new Date(form.startTime).getTime()
    const endTime = new Date(form.endTime).getTime()

    if (endTime <= startTime) { toast.error('结束时间必须晚于开始时间'); return }

    const conflicts = getConflicts(currentBandId, startTime, endTime, editingEvent?.id)
    if (conflicts.length > 0 && !pendingSave) {
      setConflictWarning(`当前时间与【${conflicts[0].title}】重叠，是否仍要保存？`)
      setPendingSave(true)
      return
    }

    try {
      let attachmentIds = editingEvent?.attachmentIds ?? []
      if (attachmentFile) {
        const fb = await uploadFile(currentBandId, attachmentFile)
        attachmentIds = [...attachmentIds, fb.id]
      }

      const data = {
        bandId: currentBandId,
        title: escapeHtml(form.title.trim()),
        type: form.type,
        startTime,
        endTime,
        location: escapeHtml(form.location),
        notes: escapeHtml(form.notes),
        attachmentIds,
        creatorMemberId: currentMemberId,
      }

      if (editingEvent) {
        await updateEvent(editingEvent.id, data)
        toast.success('日程已更新')
      } else {
        await createEvent(data)
        toast.success('日程已创建')
      }
      setShowForm(false)
      setConflictWarning(null)
      setPendingSave(false)
    } catch (e) {
      toast.error('操作失败：' + (e as Error).message)
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    if (!can('delete_any_event', { resourceCreatorId: deleteTarget.creatorMemberId })) {
      toast.error('权限不足')
      return
    }
    try {
      await deleteEvent(deleteTarget.id)
      toast.success('日程已删除')
      setDeleteTarget(null)
      setSelectedEvent(null)
    } catch (e) {
      toast.error('删除失败：' + (e as Error).message)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">日程管理</h1>
        {can('create_event') && (
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg"
            style={{ minHeight: 44 }}
          >
            <Plus className="w-4 h-4" />
            新建日程
          </button>
        )}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-50 flex-wrap">
        {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
            {label}
          </div>
        ))}
      </div>

      {/* 日历 */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile() ? 'timeGridWeek' : 'dayGridMonth'}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            locale="zh-cn"
            buttonText={{ today: '今天', month: '月', week: '周', day: '日' }}
            events={calendarEvents}
            dateClick={info => openCreate(info.dateStr)}
            eventClick={info => {
              const ev = getEventById(info.event.id)
              if (ev) setSelectedEvent(ev)
            }}
            height="auto"
            aspectRatio={isMobile() ? 1.2 : 1.8}
          />
        </div>
      </div>

      {/* 日程详情弹窗 */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-sm md:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white mb-2 inline-block"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[selectedEvent.type] }}
                >
                  {EVENT_TYPE_LABELS[selectedEvent.type]}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-gray-400 hover:text-gray-600" style={{ minWidth: 44, minHeight: 44 }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{formatDate(selectedEvent.startTime)} ~ {formatDate(selectedEvent.endTime, 'time')}</span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{selectedEvent.notes}</span>
                </div>
              )}
              {selectedEvent.attachmentIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{selectedEvent.attachmentIds.length} 个附件</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              {can('edit_any_event', { resourceCreatorId: selectedEvent.creatorMemberId }) && (
                <button
                  onClick={() => openEdit(selectedEvent)}
                  className="flex-1 py-2 text-sm text-blue-500 border border-blue-200 hover:bg-blue-50 rounded-lg"
                  style={{ minHeight: 44 }}
                >
                  编辑
                </button>
              )}
              {can('delete_any_event', { resourceCreatorId: selectedEvent.creatorMemberId }) && (
                <button
                  onClick={() => setDeleteTarget(selectedEvent)}
                  className="flex-1 py-2 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-lg"
                  style={{ minHeight: 44 }}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 创建/编辑表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{editingEvent ? '编辑日程' : '新建日程'}</h3>
              <button onClick={() => { setShowForm(false); setConflictWarning(null); setPendingSave(false) }} className="p-2 text-gray-400" style={{ minWidth: 44, minHeight: 44 }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                ⚠️ {conflictWarning}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setConflictWarning(null); setPendingSave(false) }} className="text-xs px-3 py-1.5 bg-gray-200 rounded" style={{ minHeight: 44 }}>取消</button>
                  <button onClick={doSave} className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded" style={{ minHeight: 44 }}>仍要保存</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">标题 *</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ minHeight: 44 }}
                  placeholder="日程标题"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">类型 *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                  style={{ minHeight: 44 }}
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">开始时间 *</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    style={{ minHeight: 44 }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">结束时间 *</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    style={{ minHeight: 44 }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">地点</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  style={{ minHeight: 44 }}
                  placeholder="可选"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">备注</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="可选"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">附件（图片/PDF，≤10MB）</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {!conflictWarning && (
              <div className="flex gap-2 justify-end mt-5">
                <button onClick={() => { setShowForm(false); setPendingSave(false) }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg" style={{ minHeight: 44 }}>取消</button>
                <button
                  onClick={doSave}
                  disabled={!form.title.trim() || !form.startTime || !form.endTime || isUploading}
                  className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  {isUploading ? '上传中...' : '保存'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除日程"
        message={`确定要删除日程「${deleteTarget?.title}」吗？关联的任务也将被删除。`}
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}
