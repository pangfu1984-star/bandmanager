import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Score } from '@/types'
import { generateId } from '@/lib/utils'

interface ScoreState {
  scores: Score[]
  isLoading: boolean
  loadScores: (bandId: string) => Promise<void>
  createScore: (data: Omit<Score, 'id' | 'uploadedAt'>) => Promise<Score>
  updateScore: (id: string, data: Partial<Score>) => Promise<void>
  deleteScore: (id: string) => Promise<void>
  searchScores: (bandId: string, query: string) => Score[]
  getRecentScores: (bandId: string, days?: number, limit?: number) => Score[]
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  scores: [],
  isLoading: false,

  loadScores: async (bandId) => {
    set({ isLoading: true })
    try {
      const scores = await db.scores.where('bandId').equals(bandId).reverse().sortBy('uploadedAt')
      set({ scores, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
    }
  },

  createScore: async (data) => {
    const score: Score = { ...data, id: generateId(), uploadedAt: Date.now() }
    await db.scores.add(score)
    set(state => ({ scores: [score, ...state.scores] }))
    return score
  },

  updateScore: async (id, data) => {
    await db.scores.update(id, data)
    set(state => ({
      scores: state.scores.map(s => s.id === id ? { ...s, ...data } : s)
    }))
  },

  deleteScore: async (id) => {
    await db.scores.delete(id)
    set(state => ({ scores: state.scores.filter(s => s.id !== id) }))
  },

  searchScores: (bandId, query) => {
    const q = query.toLowerCase()
    return get().scores.filter(s =>
      s.bandId === bandId && (
        s.songName.toLowerCase().includes(q) ||
        s.instrument.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      )
    )
  },

  getRecentScores: (bandId, days = 7, limit = 4) => {
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    return get().scores
      .filter(s => s.bandId === bandId && s.uploadedAt >= since)
      .slice(0, limit)
  }
}))
