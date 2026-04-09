import { useEffect, useState } from 'react'
import { AppRouter } from './router'
import { ToastContainer } from './components/Toast'
import { Spinner } from './components/Spinner'
import { initMockData } from './lib/mockData'
import { useBandStore } from './store/useBandStore'
import { useMemberStore } from './store/useMemberStore'
import { useEventStore } from './store/useEventStore'
import { useTaskStore } from './store/useTaskStore'
import { useScoreStore } from './store/useScoreStore'
import { useSetlistStore } from './store/useSetlistStore'

function AppInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const { loadBands, currentBandId } = useBandStore()
  const { loadMembers } = useMemberStore()
  const { loadEvents } = useEventStore()
  const { loadTasks } = useTaskStore()
  const { loadScores } = useScoreStore()
  const { loadSetlists } = useSetlistStore()

  useEffect(() => {
    async function init() {
      try {
        await initMockData()
        await loadBands()
        const bandId = useBandStore.getState().currentBandId
        if (bandId) {
          await Promise.all([
            loadMembers(bandId),
            loadEvents(bandId),
            loadTasks(bandId),
            loadScores(bandId),
            loadSetlists(bandId),
          ])
        }
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setReady(true)
      }
    }
    init()
  }, [])

  // 当 bandId 变化时重新加载数据
  useEffect(() => {
    if (!currentBandId || !ready) return
    Promise.all([
      loadMembers(currentBandId),
      loadEvents(currentBandId),
      loadTasks(currentBandId),
      loadScores(currentBandId),
      loadSetlists(currentBandId),
    ])
  }, [currentBandId])

  if (!ready) return <Spinner fullscreen text="正在加载数据..." />
  return <>{children}</>
}

function App() {
  return (
    <>
      <AppInitializer>
        <AppRouter />
      </AppInitializer>
      <ToastContainer />
    </>
  )
}

export default App
