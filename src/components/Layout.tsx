import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Calendar, Music, CheckSquare, User,
  LayoutDashboard, List, Settings, Shield, Users, Cloud
} from 'lucide-react'
import { useBandStore } from '@/store/useBandStore'
import { useMemberStore } from '@/store/useMemberStore'
import { APP_VERSION } from '@/lib/constants'

const MOBILE_TABS = [
  { to: '/', icon: <Home />, label: '首页' },
  { to: '/calendar', icon: <Calendar />, label: '日程' },
  { to: '/scores', icon: <Music />, label: '乐谱' },
  { to: '/tasks', icon: <CheckSquare />, label: '任务' },
  { to: '/sync', icon: <Cloud />, label: '同步' },
]

const SIDEBAR_ITEMS = [
  { to: '/', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
  { to: '/calendar', icon: <Calendar className="w-5 h-5" />, label: '日程管理' },
  { to: '/tasks', icon: <CheckSquare className="w-5 h-5" />, label: '任务管理' },
  { to: '/scores', icon: <Music className="w-5 h-5" />, label: '乐谱库' },
  { to: '/setlists', icon: <List className="w-5 h-5" />, label: '歌单管理' },
  { to: '/band-settings', icon: <Users className="w-5 h-5" />, label: '乐队设置' },
  { to: '/sync', icon: <Cloud className="w-5 h-5" />, label: '云端同步' },
  { to: '/backup', icon: <Shield className="w-5 h-5" />, label: '数据备份' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { getCurrentBand, bands, setCurrentBand } = useBandStore()
  const { getCurrentMember } = useMemberStore()
  const currentBand = getCurrentBand()
  const currentMember = getCurrentMember()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* PC 侧边栏 */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">BandManager</h1>
              <p className="text-xs text-gray-400">{APP_VERSION}</p>
            </div>
          </div>
        </div>

        {/* 乐队选择 */}
        {currentBand && (
          <div className="px-3 py-2 border-b border-gray-50">
            <select
              className="w-full text-sm text-gray-700 bg-gray-50 border-0 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={currentBand.id}
              onChange={e => setCurrentBand(e.target.value)}
            >
              {bands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 菜单 */}
        <nav className="flex-1 py-2 overflow-auto">
          {SIDEBAR_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 用户信息 */}
        {currentMember && (
          <div className="px-4 py-3 border-t border-gray-100">
            <NavLink to="/my" className="flex items-center gap-2 hover:opacity-80">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-xs">{currentMember.name[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{currentMember.name}</p>
                <p className="text-xs text-gray-400 truncate">{currentMember.instrument}</p>
              </div>
            </NavLink>
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* 移动端底部导航 */}
        <nav className="md:hidden flex-shrink-0 bg-white border-t border-gray-100 safe-area-pb">
          <div className="flex">
            {MOBILE_TABS.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2 text-xs transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`
                }
                style={{ minHeight: 56 }}
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-5 h-5 mb-0.5 ${isActive ? '[&>*]:stroke-blue-600' : '[&>*]:stroke-gray-400'}`}>
                      {tab.icon}
                    </div>
                    <span className="text-[10px]">{tab.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </main>
    </div>
  )
}
