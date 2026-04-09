import { create } from 'zustand'
import { db } from '@/lib/db'
import type { BandEvent } from '@/types'
import { generateId, checkTimeConflict } from '@/lib/utils'

interface EventState {
  events: BandEvent[]
  isLoading: boolean
  loadEvents: (bandId: string) => Promise<void>
  createEvent: (data: Omit<BandEvent, 'id' | 'createdAt'>) => Promise<BandEvent>
  updateEvent: (id: string, data: Partial<BandEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  getConflicts: (bandId: string, start: number, end: number, excludeId?: string) => BandEvent[]
  getEventById: (id: string) => BandEvent | undefined
  getTodayEvents: (bandId: string) => BandEvent[]
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  isLoading: false,

  loadEvents: async (bandId) => {
    set({ isLoading: true })
    try {
      const events = await db.events.where('bandId').equals(bandId).sortBy('startTime')
      set({ events, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
    }
  },

  createEvent: async (data) => {
    const event: BandEvent = { ...data, id: generateId(), createdAt: Date.now() }
    await db.events.add(event)
    set(state => ({ events: [...state.events, event].sort((a, b) => a.startTime - b.startTime) }))
    return event
  },

  updateEvent: async (id, data) => {
    await db.events.update(id, data)
    set(state => ({
      events: state.events.map(e => e.id === id ? { ...e, ...data } : e)
        .sort((a, b) => a.startTime - b.startTime)
    }))
  },

  deleteEvent: async (id) => {
    await db.events.delete(id)
    // 级联删除任务
    await db.tasks.where('eventId').equals(id).delete()
    set(state => ({ events: state.events.filter(e => e.id !== id) }))
  },

  getConflicts: (bandId, start, end, excludeId) => {
    return get().events.filter(e =>
      e.bandId === bandId &&
      e.id !== excludeId &&
      checkTimeConflict(start, end, e.startTime, e.endTime)
    )
  },

  getEventById: (id) => get().events.find(e => e.id === id),

  getTodayEvents: (bandId) => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000
    return get().events.filter(e =>
      e.bandId === bandId &&
      e.startTime < endOfDay &&
      e.endTime > startOfDay
    )
  }
}))
