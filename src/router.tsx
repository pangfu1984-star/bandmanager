import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { ScoresPage } from '@/features/scores/ScoresPage'
import { SetlistsPage } from '@/features/setlists/SetlistsPage'
import { BandSettingsPage } from '@/features/band/BandSettingsPage'
import { BackupPage } from '@/features/backup/BackupPage'
import { MyPage } from '@/features/my/MyPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function WrapRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<WrapRoute component={DashboardPage} />} />
          <Route path="/calendar" element={<WrapRoute component={CalendarPage} />} />
          <Route path="/tasks" element={<WrapRoute component={TasksPage} />} />
          <Route path="/scores" element={<WrapRoute component={ScoresPage} />} />
          <Route path="/setlists" element={<WrapRoute component={SetlistsPage} />} />
          <Route path="/band-settings" element={<WrapRoute component={BandSettingsPage} />} />
          <Route path="/backup" element={<WrapRoute component={BackupPage} />} />
          <Route path="/my" element={<WrapRoute component={MyPage} />} />
          <Route path="/user-guide" element={<WrapRoute component={() => (
            <div className="p-6 max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">用户操作手册</h1>
              <p className="text-gray-500 mb-4">请查阅项目根目录的 <code>USER_GUIDE.md</code></p>
            </div>
          )} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
