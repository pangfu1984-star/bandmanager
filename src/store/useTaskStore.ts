import { create } from 'zustand'
import { db } from '@/lib/db'
import type { Task } from '@/types'
import { generateId } from '@/lib/utils'

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  loadTasks: (bandId: string) => Promise<void>
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => Promise<Task>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  uncompleteTask: (id: string) => Promise<void>
  getTasksByEvent: (eventId: string) => Task[]
  getMyTasks: (memberId: string) => Task[]
  getCompletionRate: (eventId: string) => number
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,

  loadTasks: async (bandId) => {
    set({ isLoading: true })
    try {
      const tasks = await db.tasks.where('bandId').equals(bandId).sortBy('dueDate')
      set({ tasks, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
    }
  },

  createTask: async (data) => {
    const task: Task = {
      ...data,
      id: generateId(),
      completed: false,
      completedAt: 0,
      createdAt: Date.now(),
    }
    await db.tasks.add(task)
    set(state => ({ tasks: [...state.tasks, task].sort((a, b) => a.dueDate - b.dueDate) }))
    return task
  },

  updateTask: async (id, data) => {
    await db.tasks.update(id, data)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t)
    }))
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
  },

  completeTask: async (id) => {
    const completedAt = Date.now()
    await db.tasks.update(id, { completed: true, completedAt })
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, completed: true, completedAt } : t)
    }))
  },

  uncompleteTask: async (id) => {
    await db.tasks.update(id, { completed: false, completedAt: 0 })
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, completed: false, completedAt: 0 } : t)
    }))
  },

  getTasksByEvent: (eventId) => get().tasks.filter(t => t.eventId === eventId),

  getMyTasks: (memberId) => get().tasks.filter(t =>
    t.assigneeMemberId === memberId || t.creatorMemberId === memberId
  ),

  getCompletionRate: (eventId) => {
    const tasks = get().tasks.filter(t => t.eventId === eventId)
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.completed).length
    return Math.round((completed / tasks.length) * 100)
  }
}))
