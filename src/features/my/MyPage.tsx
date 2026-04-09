import { Link } from 'react-router-dom'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { usePermission } from '@/hooks/usePermission'
import { ROLE_LABELS, APP_VERSION } from '@/lib/constants'
import { Shield, ChevronRight, User, Music, LogOut, FileText } from 'lucide-react'

export function MyPage() {
  const { getCurrentBand, bands, setCurrentBand } = useBandStore()
  const { getCurrentMember, setCurrentMember, members } = useMemberStore()
  const { isAdmin } = usePermission()

  const currentBand = getCurrentBand()
  const currentMember = getCurrentMember()

  return (
    <div className="overflow-auto h-full">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 py-2">我的</h1>

        {/* 当前成员信息 */}
        {currentMember && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-xl">{currentMember.name[0]}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{currentMember.name}</p>
                <p className="text-sm text-gray-500">{currentMember.instrument}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[currentMember.role]}
                </span>
              </div>
            </div>

            {/* 切换身份 */}
            {members.length > 1 && (
              <div className="mt-4">
                <label className="text-sm text-gray-500 block mb-1">切换身份</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                  value={currentMember.id}
                  onChange={e => setCurrentMember(e.target.value)}
                  style={{ minHeight: 44 }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({ROLE_LABELS[m.role]})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* 乐队 */}
        {currentBand && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Music className="w-4 h-4 text-blue-500" />
                当前乐队
              </h2>
            </div>
            <div className="p-4">
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                value={currentBand.id}
                onChange={e => setCurrentBand(e.target.value)}
                style={{ minHeight: 44 }}
              >
                {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* 备份入口 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              数据管理
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            <Link to="/backup" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" style={{ minHeight: 56 }}>
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700">备份与恢复</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
          </div>
        </div>

        {/* 应用信息 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            <Link to="/user-guide" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" style={{ minHeight: 56 }}>
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-700">用户操作手册</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </Link>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">BandManager</p>
                <p className="text-xs text-gray-400">{APP_VERSION}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
