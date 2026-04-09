import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Setlist, SetlistSong } from '@/types'
import { generateId } from '@/lib/utils'

interface SetlistState {
  setlists: Setlist[]
  isLoading: boolean
  loadSetlists: (bandId: string) => Promise<void>
  createSetlist: (data: Omit<Setlist, 'id' | 'updatedAt'>) => Promise<Setlist>
  updateSetlist: (id: string, data: Partial<Setlist>) => Promise<void>
  deleteSetlist: (id: string) => Promise<void>
  addSongToSetlist: (setlistId: string, song: SetlistSong) => Promise<void>
  removeSongFromSetlist: (setlistId: string, scoreId: string) => Promise<void>
  reorderSongs: (setlistId: string, songs: SetlistSong[]) => Promise<void>
  updateSongNotes: (setlistId: string, scoreId: string, notes: string) => Promise<void>
  getRecentSetlists: (bandId: string, limit?: number) => Setlist[]
}

export const useSetlistStore = create<SetlistState>((set, get) => ({
  setlists: [],
  isLoading: false,

  loadSetlists: async (bandId) => {
    set({ isLoading: true })
    try {
      const setlists = await db.setlists.where('bandId').equals(bandId).reverse().sortBy('updatedAt')
      set({ setlists, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
    }
  },

  createSetlist: async (data) => {
    const setlist: Setlist = { ...data, id: generateId(), updatedAt: Date.now() }
    await db.setlists.add(setlist)
    set(state => ({ setlists: [setlist, ...state.setlists] }))
    return setlist
  },

  updateSetlist: async (id, data) => {
    const updatedAt = Date.now()
    await db.setlists.update(id, { ...data, updatedAt })
    set(state => ({
      setlists: state.setlists.map(s => s.id === id ? { ...s, ...data, updatedAt } : s)
    }))
  },

  deleteSetlist: async (id) => {
    await db.setlists.delete(id)
    set(state => ({ setlists: state.setlists.filter(s => s.id !== id) }))
  },

  addSongToSetlist: async (setlistId, song) => {
    const setlist = get().setlists.find(s => s.id === setlistId)
    if (!setlist) return
    const songs = [...setlist.songs, { ...song, order: setlist.songs.length }]
    await get().updateSetlist(setlistId, { songs })
  },

  removeSongFromSetlist: async (setlistId, scoreId) => {
    const setlist = get().setlists.find(s => s.id === setlistId)
    if (!setlist) return
    const songs = setlist.songs.filter(s => s.scoreId !== scoreId)
      .map((s, i) => ({ ...s, order: i }))
    await get().updateSetlist(setlistId, { songs })
  },

  reorderSongs: async (setlistId, songs) => {
    await get().updateSetlist(setlistId, { songs })
  },

  updateSongNotes: async (setlistId, scoreId, notes) => {
    const setlist = get().setlists.find(s => s.id === setlistId)
    if (!setlist) return
    const songs = setlist.songs.map(s => s.scoreId === scoreId ? { ...s, notes } : s)
    await get().updateSetlist(setlistId, { songs })
  },

  getRecentSetlists: (bandId, limit = 3) => {
    return get().setlists.filter(s => s.bandId === bandId).slice(0, limit)
  }
}))
