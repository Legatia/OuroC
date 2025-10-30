// Jest setup file
import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for Solana
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder as any
}

// Mock Web APIs that aren't available in jsdom
global.crypto = {
  ...global.crypto,
  randomUUID: () => Math.random().toString(36).substring(2, 15)
} as any

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock fetch
global.fetch = jest.fn() as any

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
