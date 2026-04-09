import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { useEventStore } from '@/store/useEventStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useScoreStore } from '@/store/useScoreStore'
import { useSetlistStore } from '@/store/useSetlistStore'
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@/lib/constants'
import { formatDate, isOverdue } from '@/lib/utils'
import { CheckCircle, Circle, Calendar, ChevronRight, Music, AlertCircle, ArrowRight } from 'lucide-react'
import { useTaskStore as useTS } from '@/store/useTaskStore'

export function DashboardPage() {
  const { getCurrentBand, bands, setCurrentBand } = useBandStore()
  const { members, currentMemberId, getCurrentMember } = useMemberStore()
  const { events, getTodayEvents } = useEventStore()
  const { tasks, completeTask, uncompleteTask } = useTaskStore()
  const { scores, getRecentScores } = useScoreStore()
  const { setlists, getRecentSetlists } = useSetlistStore()

  const currentBand = getCurrentBand()
  const currentMember = getCurrentMember()
  const today = new Date()
  const todayStr = formatDate(today.getTime(), 'date')

  if (!currentBand) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Music className="w-16 h-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">欢迎使用 BandManager</h2>
        <p className="text-gray-400 mb-6">开始创建你的乐队吧</p>
        <Link to="/band-settings" className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600">
          创建乐队
        </Link>
      </div>
    )
  }

  const todayEvents = getTodayEvents(currentBand.id)
  const myTasks = tasks.filter(t =>
    t.bandId === currentBand.id &&
    (t.assigneeMemberId === currentMemberId || t.creatorMemberId === currentMemberId) &&
    !t.completed
  ).sort((a, b) => a.dueDate - b.dueDate).slice(0, 5)

  const overdueTasks = tasks.filter(t =>
    t.bandId === currentBand.id &&
    (t.assigneeMemberId === currentMemberId || t.creatorMemberId === currentMemberId) &&
    !t.completed && isOverdue(t.dueDate)
  )

  const recentScores = getRecentScores(currentBand.id)
  const recentSetlists = getRecentSetlists(currentBand.id)

  return (
    <div className="overflow-auto h-full">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5 pb-safe">
        {/* 顶部：乐队名+日期 */}
        <div className="flex items-center justify-between">
          <div>
            <select
              className="text-xl font-bold text-gray-900 bg-transparent border-0 focus:outline-none pr-2 cursor-pointer"
              value={currentBand.id}
              onChange={e => setCurrentBand(e.target.value)}
            >
              {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="text-sm text-gray-400">{todayStr} · {['日', '一', '二', '三', '四', '五', '六'][today.getDay()]}曜日</p>
          </div>
          {currentMember && (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold">{currentMember.name[0]}</span>
            </div>
          )}
        </div>

        {/* 逾期提醒 */}
        {overdueTasks.length > 0 && (
          <Link to="/tasks" className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-600 flex-1">有 <strong>{overdueTasks.length}</strong> 个任务已逾期</span>
            <ChevronRight className="w-4 h-4 text-red-300" />
          </Link>
        )}

        {/* 今日日程 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              今日日程
            </h2>
            <Link to="/calendar" className="text-sm text-blue-500 flex items-center gap-1" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
              查看全部 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">今天没有日程安排</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayEvents.map(ev => (
                <Link key={ev.id} to="/calendar" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: EVENT_TYPE_COLORS[ev.type] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(ev.startTime, 'time')} - {formatDate(ev.endTime, 'time')}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{EVENT_TYPE_LABELS[ev.type]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 我的待办 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              我的待办
            </h2>
            <Link to="/tasks" className="text-sm text-blue-500 flex items-center gap-1" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
              查看更多 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无待办任务</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {myTasks.map(task => {
                const overdue = isOverdue(task.dueDate)
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      onClick={async () => {
                        await completeTask(task.id)
                      }}
                      style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Circle className={`w-5 h-5 ${overdue ? 'text-red-300' : 'text-gray-300'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${overdue ? 'text-red-700' : 'text-gray-800'} truncate`}>{task.title}</p>
                      <p className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                        截止 {formatDate(task.dueDate, 'date')}{overdue && ' · 已逾期'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 最近乐谱 */}
        {recentScores.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-500" />
                最近更新乐谱
              </h2>
              <Link to="/scores" className="text-sm text-blue-500 flex items-center gap-1" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {recentScores.map(score => (
                <Link key={score.id} to="/scores" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Music className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{score.songName}</p>
                    <p className="text-xs text-gray-400">{formatDate(score.uploadedAt, 'date')}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 常用歌单 */}
        {recentSetlists.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">常用歌单</h2>
              <Link to="/setlists" className="text-sm text-blue-500 flex items-center gap-1" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
                查看全部 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentSetlists.map(sl => (
                <Link key={sl.id} to="/setlists" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 text-xs font-bold">{sl.songs.length}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sl.name}</p>
                    <p className="text-xs text-gray-400">{sl.songs.length} 首曲目</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
