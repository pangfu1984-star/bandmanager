import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { useEventStore } from '@/store/useEventStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { formatDate, isOverdue, calcCompletionRate, escapeHtml } from '@/lib/utils'
import { CheckCircle, Circle, Plus, Trash2, AlertCircle, Bell } from 'lucide-react'
import type { Task, TaskTab } from '@/types'

const PAGE_SIZE = 20

export function TasksPage() {
  const { tasks, createTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { currentBandId } = useBandStore()
  const { members, currentMemberId } = useMemberStore()
  const { events } = useEventStore()
  const { can } = usePermission()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TaskTab>('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', assigneeMemberId: '', dueDate: '', eventId: '', details: '' })
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [page, setPage] = useState(1)

  // 通知权限请求
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 逾期任务通知检查
  useEffect(() => {
    const now = Date.now()
    tasks.forEach(t => {
      if (!t.completed && t.dueDate && t.dueDate < now + 60000 && t.dueDate > now - 60000) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`任务截止提醒：${t.title}`, { body: '截止时间即将到达' })
        }
      }
    })
  }, [tasks])

  const bandTasks = tasks.filter(t => t.bandId === currentBandId)
  const myTasks = bandTasks.filter(t =>
    t.assigneeMemberId === currentMemberId || t.creatorMemberId === currentMemberId
  )

  const pendingTasks = myTasks.filter(t => !t.completed && !isOverdue(t.dueDate))
  const completedTasks = myTasks.filter(t => t.completed)
  const overdueTasks = myTasks.filter(t => !t.completed && isOverdue(t.dueDate))

  const currentList = activeTab === 'pending' ? pendingTasks : activeTab === 'completed' ? completedTasks : overdueTasks
  const paged = currentList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const bandEvents = events.filter(e => e.bandId === currentBandId)
  const currentMember = members.find(m => m.id === currentMemberId)

  async function saveTask() {
    if (!form.title.trim()) { toast.error('任务名称不能为空'); return }
    if (!form.assigneeMemberId) { toast.error('请选择指派人'); return }
    if (!form.dueDate) { toast.error('请填写截止时间'); return }
    try {
      await createTask({
        eventId: form.eventId || 'standalone',
        bandId: currentBandId,
        title: escapeHtml(form.title.trim()),
        assigneeMemberId: form.assigneeMemberId,
        dueDate: new Date(form.dueDate).getTime(),
        details: escapeHtml(form.details),
        creatorMemberId: currentMemberId,
      })
      toast.success('任务已创建')
      setShowForm(false)
      setForm({ title: '', assigneeMemberId: '', dueDate: '', eventId: '', details: '' })
    } catch (e) {
      toast.error('创建失败：' + (e as Error).message)
    }
  }

  async function toggleTask(task: Task) {
    if (!can('complete_any_task', { resourceCreatorId: task.creatorMemberId, assigneeId: task.assigneeMemberId })) {
      toast.error('权限不足：只能操作自己的任务')
      return
    }
    try {
      if (task.completed) {
        await uncompleteTask(task.id)
        toast.success('任务已恢复为待办')
      } else {
        await completeTask(task.id)
        toast.success('任务已完成')
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function doDelete() {
    if (!deleteTarget) return
    if (!can('delete_others_task') && deleteTarget.creatorMemberId !== currentMemberId) {
      toast.error('权限不足')
      return
    }
    try {
      await deleteTask(deleteTarget.id)
      toast.success('任务已删除')
      setDeleteTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const TABS: { key: TaskTab; label: string; count: number }[] = [
    { key: 'pending', label: '待办', count: pendingTasks.length },
    { key: 'completed', label: '已完成', count: completedTasks.length },
    { key: 'overdue', label: '逾期', count: overdueTasks.length },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 逾期提醒横幅 */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">你有 <strong>{overdueTasks.length}</strong> 个逾期任务未完成</p>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">我的任务</h1>
        {can('create_task') && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg"
            style={{ minHeight: 44 }}
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        )}
      </div>

      {/* Tab */}
      <div className="flex border-b border-gray-100 bg-white">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ minHeight: 44 }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab.key === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {paged.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-12 h-12 text-gray-300" />}
            title={activeTab === 'pending' ? '暂无待办任务' : activeTab === 'completed' ? '暂无已完成任务' : '暂无逾期任务'}
            description={activeTab === 'pending' ? '点击右上角+号创建任务' : undefined}
          />
        ) : (
          <div className="p-4 space-y-2">
            {paged.map(task => {
              const assignee = members.find(m => m.id === task.assigneeMemberId)
              const event = bandEvents.find(e => e.id === task.eventId)
              const overdue = isOverdue(task.dueDate) && !task.completed
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-4 ${overdue ? 'border-red-200' : 'border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task)}
                      className="mt-0.5 flex-shrink-0"
                      style={{ minWidth: 24, minHeight: 24 }}
                    >
                      {task.completed
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Circle className={`w-5 h-5 ${overdue ? 'text-red-400' : 'text-gray-300'}`} />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : overdue ? 'text-red-700' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                          截止 {formatDate(task.dueDate, 'date')}
                          {overdue && ' · 已逾期'}
                        </span>
                        {assignee && (
                          <span className="text-xs text-gray-400">· 指派给 {assignee.name}</span>
                        )}
                        {event && (
                          <span className="text-xs text-blue-400 truncate">· {event.title}</span>
                        )}
                      </div>
                      {task.details && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.details}</p>
                      )}
                    </div>
                    {(can('delete_others_task') || task.creatorMemberId === currentMemberId) && (
                      <button
                        onClick={() => setDeleteTarget(task)}
                        className="p-1.5 text-gray-300 hover:text-red-400 flex-shrink-0"
                        style={{ minWidth: 44, minHeight: 44 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            <Pagination page={page} pageSize={PAGE_SIZE} total={currentList.length} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* 新建任务表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">新建任务</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">任务名称 *</label>
                <input
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ minHeight: 44 }}
                  placeholder="任务名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">指派给 *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={form.assigneeMemberId}
                  onChange={e => setForm(f => ({ ...f, assigneeMemberId: e.target.value }))}
                  style={{ minHeight: 44 }}
                >
                  <option value="">请选择成员</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">截止时间 *</label>
                <input
                  type="datetime-local"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ minHeight: 44 }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">关联日程（可选）</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={form.eventId}
                  onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}
                  style={{ minHeight: 44 }}
                >
                  <option value="">无</option>
                  {bandEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">任务详情（可选）</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={2}
                  value={form.details}
                  onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && saveTask()}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg" style={{ minHeight: 44 }}>取消</button>
              <button onClick={saveTask} className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg" style={{ minHeight: 44 }}>创建</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="删除任务"
        message={`确定要删除任务「${deleteTarget?.title}」吗？`}
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}
