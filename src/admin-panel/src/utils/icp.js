import { Actor, HttpAgent } from '@dfinity/agent'
import { AuthClient } from '@dfinity/auth-client'

// Detect local development environment
const isLocal = window.location.hostname.includes('localhost') ||
                window.location.hostname.includes('127.0.0.1') ||
                window.location.port === '4944'

// OuroC_timer canister ID (automatically switches between local and mainnet)
export const TIMER_CANISTER_ID = isLocal
  ? 'uxrrr-q7777-77774-qaaaq-cai'  // Local
  : '7tbxr-naaaa-aaaao-qkrca-cai'   // Mainnet

// Authentication provider URLs
const INTERNET_IDENTITY_URL = isLocal
  ? `http://localhost:4944?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai`
  : 'https://identity.ic0.app'

const NFID_URL = 'https://nfid.one/authenticate/?applicationName=OuroC+Admin'

// Timer canister IDL
const timerIDL = ({ IDL }) => {
  const CanisterHealth = IDL.Record({
    'status': IDL.Variant({
      'Healthy': IDL.Null,
      'Degraded': IDL.Null,
      'Critical': IDL.Null,
      'Offline': IDL.Null
    }),
    'uptime_seconds': IDL.Nat,
    'subscription_count': IDL.Nat,
    'active_timers': IDL.Nat,
    'failed_payments': IDL.Nat,
    'cycle_balance': IDL.Nat,
    'memory_usage': IDL.Nat,
    'is_degraded': IDL.Bool,
    'degradation_reason': IDL.Opt(IDL.Text)
  })

  const SystemMetrics = IDL.Record({
    'total_subscriptions': IDL.Nat,
    'active_subscriptions': IDL.Nat,
    'paused_subscriptions': IDL.Nat,
    'total_payments_processed': IDL.Nat,
    'failed_payment_count': IDL.Nat,
    'uptime_seconds': IDL.Nat
  })

  const NetworkConfig = IDL.Record({
    'network': IDL.Variant({
      'Mainnet': IDL.Null,
      'Devnet': IDL.Null,
      'Testnet': IDL.Null
    }),
    'rpc_endpoint': IDL.Text,
    'keypair_name': IDL.Text
  })

  const WalletAddresses = IDL.Record({
    'main': IDL.Text
  })

  return IDL.Service({
    'get_canister_health': IDL.Func([], [CanisterHealth], ['query']),
    'get_system_metrics': IDL.Func([], [SystemMetrics], ['query']),
    'get_network_config': IDL.Func([], [NetworkConfig], ['query']),
    'get_wallet_addresses': IDL.Func([], [IDL.Variant({
      'ok': WalletAddresses,
      'err': IDL.Text
    })], []),
    'emergency_pause_all': IDL.Func([], [IDL.Variant({
      'ok': IDL.Nat,
      'err': IDL.Text
    })], [])
  })
}

let authClient = null
let timerActor = null

// Initialize auth client
export async function initAuthClient() {
  if (!authClient) {
    authClient = await AuthClient.create()
  }
  return authClient
}

// Check if authenticated
export async function isAuthenticated() {
  const client = await initAuthClient()
  return await client.isAuthenticated()
}

// Login with Internet Identity
export async function loginWithII() {
  const client = await initAuthClient()

  return new Promise((resolve, reject) => {
    client.login({
      identityProvider: INTERNET_IDENTITY_URL,
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
      onSuccess: async () => {
        // Get and log the principal ID for easy access
        const identity = client.getIdentity()
        const principal = identity.getPrincipal().toText()
        console.log('✅ Logged in with Internet Identity')
        console.log('📋 Your Principal ID:', principal)
        console.log('💡 Use this principal to add yourself as admin:')
        console.log(`   dfx canister call OuroC_timer add_admin '(principal "${principal}")'`)
        resolve(true)
      },
      onError: (error) => reject(error),
    })
  })
}

// Login with NFID
export async function loginWithNFID() {
  const client = await initAuthClient()

  return new Promise((resolve, reject) => {
    client.login({
      identityProvider: NFID_URL,
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
      onSuccess: async () => {
        // Get and log the principal ID for easy access
        const identity = client.getIdentity()
        const principal = identity.getPrincipal().toText()
        console.log('✅ Logged in with NFID')
        console.log('📋 Your Principal ID:', principal)
        console.log('💡 Use this principal to add yourself as admin:')
        console.log(`   dfx canister call OuroC_timer add_admin '(principal "${principal}")'`)
        resolve(true)
      },
      onError: (error) => reject(error),
      windowOpenerFeatures: `
        left=${window.screen.width / 2 - 525 / 2},
        top=${window.screen.height / 2 - 705 / 2},
        toolbar=0,location=0,menubar=0,width=525,height=705
      `,
    })
  })
}

// Logout
export async function logout() {
  const client = await initAuthClient()
  await client.logout()
  timerActor = null
}

// Get timer actor
export async function getTimerActor() {
  if (timerActor) return timerActor

  const client = await initAuthClient()
  const identity = client.getIdentity()

  const agent = new HttpAgent({
    identity,
    host: isLocal ? 'http://localhost:4944' : 'https://ic0.app'
  })

  // Only for local development
  if (isLocal) {
    await agent.fetchRootKey()
  }

  timerActor = Actor.createActor(timerIDL, {
    agent,
    canisterId: TIMER_CANISTER_ID,
  })

  return timerActor
}

// Canister health data fetching
export async function getCanisterHealth() {
  const actor = await getTimerActor()
  return await actor.get_canister_health()
}

export async function getSystemMetrics() {
  const actor = await getTimerActor()
  return await actor.get_system_metrics()
}

export async function getNetworkConfig() {
  const actor = await getTimerActor()
  return await actor.get_network_config()
}

export async function getWalletAddresses() {
  const actor = await getTimerActor()
  return await actor.get_wallet_addresses()
}

export async function emergencyPauseAll() {
  const actor = await getTimerActor()
  return await actor.emergency_pause_all()
}

// Get current user's principal ID
export async function getCurrentPrincipal() {
  const client = await initAuthClient()
  const identity = client.getIdentity()
  return identity.getPrincipal().toText()
}
