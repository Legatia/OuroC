// Core exports
export { OuroCClient } from './core/OuroCClient'
export { SecureOuroCClient } from './core/SecureOuroCClient'
export type { CanisterHealth } from './core/OuroCClient'
export * from './core/types'

// Provider exports
export {
  OuroCProvider,
} from './providers/OuroCProvider'

// Hook exports
export * from './hooks'

// Component exports
export * from './components'

// Solana utilities
export * from './solana'

// Services
export { PushNotificationService } from './services/PushNotificationService'

// Grid API Integration (Squads Protocol)
export * from './grid'

// CSS imports for default styling
import './styles/default.css'