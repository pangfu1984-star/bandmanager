import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { usePermission } from '@/hooks/usePermission'
import { useToast } from '@/hooks/useToast'
import { ROLE_LABELS, APP_VERSION } from '@/lib/constants'
import { Shield, ChevronRight, User, Music, LogOut, FileText, Lock, Eye, EyeOff } from 'lucide-react'
import type { Member } from '@/types'

export function MyPage() {
  const { getCurrentBand, bands, setCurrentBand } = useBandStore()
  const { getCurrentMember, setCurrentMember, members } = useMemberStore()
  const { isAdmin } = usePermission()
  const { toast } = useToast()
  const currentBand = getCurrentBand()
  const currentMember = getCurrentMember()

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pendingMember, setPendingMember] = useState<Member | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleMemberChange = (memberId: string) => {
    const targetMember = members.find(m => m.id === memberId)
    if (!targetMember || !currentBand) {
      setCurrentMember(memberId)
      return
    }

    // 如果切换到管理员身份且设置了密码，需要验证
    if (targetMember.role === 'admin' && currentBand.adminPassword && targetMember.id !== currentMember?.id) {
      setPendingMember(targetMember)
      setPassword('')
      setShowPasswordDialog(true)
      return
    }

    setCurrentMember(memberId)
  }

  const verifyPassword = () => {
    if (!pendingMember || !currentBand) return

    if (password === currentBand.adminPassword) {
      setCurrentMember(pendingMember.id)
      setShowPasswordDialog(false)
      setPendingMember(null)
      setPassword('')
      toast.success('已切换为管理员身份')
    } else {
      toast.error('密码错误')
    }
  }

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
                  onChange={e => handleMemberChange(e.target.value)}
                  style={{ minHeight: 44 }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({ROLE_LABELS[m.role]}){m.role === 'admin' && currentBand?.adminPassword ? ' 🔒' : ''}
                    </option>
                  ))}
                </select>
                {currentBand?.adminPassword && (
                  <p className="text-xs text-gray-400 mt-1">切换为管理员需要输入密码</p>
                )}
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

      {/* 管理员密码验证弹窗 */}
      {showPasswordDialog && pendingMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">验证管理员身份</h3>
                <p className="text-sm text-gray-500">切换到 {pendingMember.name}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">管理员密码</label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showPassword ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ minHeight: 44 }}
                    placeholder="请输入管理员密码"
                    onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => { setShowPasswordDialog(false); setPendingMember(null); setPassword('') }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                style={{ minHeight: 44 }}
              >
                取消
              </button>
              <button
                onClick={verifyPassword}
                className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
                style={{ minHeight: 44 }}
              >
                验证
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
