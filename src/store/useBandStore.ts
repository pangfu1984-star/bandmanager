import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Band } from '@/types'
import { generateId } from '@/lib/utils'

interface BandState {
  bands: Band[]
  currentBandId: string
  isLoading: boolean
  loadBands: () => Promise<void>
  setCurrentBand: (bandId: string) => void
  createBand: (data: Omit<Band, 'id' | 'createdAt'>) => Promise<Band>
  updateBand: (id: string, data: Partial<Band>) => Promise<void>
  deleteBand: (id: string) => Promise<void>
  getCurrentBand: () => Band | undefined
}

export const useBandStore = create<BandState>((set, get) => ({
  bands: [],
  currentBandId: localStorage.getItem('currentBandId') ?? '',
  isLoading: false,

  loadBands: async () => {
    set({ isLoading: true })
    try {
      const bands = await db.bands.orderBy('createdAt').toArray()
      const stored = localStorage.getItem('currentBandId')
      const currentBandId = stored && bands.find(b => b.id === stored) ? stored : (bands[0]?.id ?? '')
      set({ bands, currentBandId, isLoading: false })
      localStorage.setItem('currentBandId', currentBandId)
    } catch (e) {
      set({ isLoading: false })
    }
  },

  setCurrentBand: (bandId) => {
    set({ currentBandId: bandId })
    localStorage.setItem('currentBandId', bandId)
  },

  createBand: async (data) => {
    const band: Band = { ...data, id: generateId(), createdAt: Date.now() }
    await db.bands.add(band)
    set(state => ({ bands: [...state.bands, band] }))
    return band
  },

  updateBand: async (id, data) => {
    await db.bands.update(id, data)
    set(state => ({
      bands: state.bands.map(b => b.id === id ? { ...b, ...data } : b)
    }))
  },

  deleteBand: async (id) => {
    await db.bands.delete(id)
    set(state => ({
      bands: state.bands.filter(b => b.id !== id),
      currentBandId: state.currentBandId === id ? (state.bands.find(b => b.id !== id)?.id ?? '') : state.currentBandId
    }))
  },

  getCurrentBand: () => {
    const { bands, currentBandId } = get()
    return bands.find(b => b.id === currentBandId)
  }
}))
