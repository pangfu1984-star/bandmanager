import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// Mock IndexedDB
;(globalThis as any).indexedDB = new IDBFactory()

// Mock Notification
;(globalThis as any).Notification = {
  permission: 'granted',
  requestPermission: vi.fn().mockResolvedValue('granted'),
} as unknown as typeof Notification

// Mock URL.createObjectURL
;(globalThis as any).URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
;(globalThis as any).URL.revokeObjectURL = vi.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
