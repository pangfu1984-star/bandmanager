import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IndexedDB
const { IDBFactory, IDBDatabase } = require('fake-indexeddb')
global.indexedDB = new IDBFactory()

// Mock Notification
global.Notification = {
  permission: 'granted',
  requestPermission: vi.fn().mockResolvedValue('granted'),
} as unknown as typeof Notification

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
global.URL.revokeObjectURL = vi.fn()

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
