import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Member, MemberRole } from '@/types'
import { generateId } from '@/lib/utils'

interface MemberState {
  members: Member[]
  currentMemberId: string
  isLoading: boolean
  loadMembers: (bandId: string) => Promise<void>
  setCurrentMember: (memberId: string) => void
  createMember: (data: Omit<Member, 'id' | 'createdAt'>) => Promise<Member>
  updateMember: (id: string, data: Partial<Member>) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  getCurrentMember: () => Member | undefined
  getMemberById: (id: string) => Member | undefined
  getAdmins: () => Member[]
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  currentMemberId: localStorage.getItem('currentMemberId') ?? '',
  isLoading: false,

  loadMembers: async (bandId) => {
    set({ isLoading: true })
    try {
      const members = await db.members.where('bandId').equals(bandId).sortBy('createdAt')
      const stored = localStorage.getItem('currentMemberId')
      const currentMemberId = stored && members.find(m => m.id === stored) ? stored : (members[0]?.id ?? '')
      set({ members, currentMemberId, isLoading: false })
      if (currentMemberId) localStorage.setItem('currentMemberId', currentMemberId)
    } catch (e) {
      set({ isLoading: false })
    }
  },

  setCurrentMember: (memberId) => {
    set({ currentMemberId: memberId })
    localStorage.setItem('currentMemberId', memberId)
  },

  createMember: async (data) => {
    const member: Member = { ...data, id: generateId(), createdAt: Date.now() }
    await db.members.add(member)
    set(state => ({ members: [...state.members, member] }))
    return member
  },

  updateMember: async (id, data) => {
    await db.members.update(id, data)
    set(state => ({
      members: state.members.map(m => m.id === id ? { ...m, ...data } : m)
    }))
  },

  deleteMember: async (id) => {
    await db.members.delete(id)
    set(state => ({
      members: state.members.filter(m => m.id !== id)
    }))
  },

  getCurrentMember: () => {
    const { members, currentMemberId } = get()
    return members.find(m => m.id === currentMemberId)
  },

  getMemberById: (id) => get().members.find(m => m.id === id),

  getAdmins: () => get().members.filter(m => m.role === 'admin'),
}))
