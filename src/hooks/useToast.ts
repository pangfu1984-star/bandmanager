import { create } from 'zustand'
import type { ToastMessage, ToastType } from '@/types'
import { generateId } from '@/lib/utils'

interface ToastState {
  toasts: ToastMessage[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = generateId()
    set(state => ({ toasts: [...state.toasts, { id, type, message, duration }] }))
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, duration)
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
}))

export function useToast() {
  const { addToast, removeToast, toasts } = useToastStore()
  return {
    toasts,
    toast: {
      success: (msg: string) => addToast('success', msg),
      error: (msg: string) => addToast('error', msg, 5000),
      warning: (msg: string) => addToast('warning', msg, 4000),
      info: (msg: string) => addToast('info', msg),
    },
    remove: removeToast,
  }
}
