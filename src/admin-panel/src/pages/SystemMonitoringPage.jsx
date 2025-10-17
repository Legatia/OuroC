import React, { useState, useEffect } from 'react'
import { Actor, HttpAgent } from '@dfinity/agent'
import { idlFactory as timerIdl } from '../../canisters/OuroC_timer.did.js'
import { idlFactory as licenseRegistryIdl } from '../../canisters/LicenseRegistry.did.js'

const TimerCanister = process.env.CANISTER_ID_OUROC_TIMER || 'vizcg-th777-77774-qaaea-cai'
const LicenseRegistryCanister = process.env.CANISTER_ID_LICENSE_REGISTRY || 'ucwa4-rx777-77774-qaada-cai'

export default function SystemMonitoringPage() {
  const [timerHealth, setTimerHealth] = useState(null)
  const [licenseStats, setLicenseStats] = useState(null)
  const [systemMetrics, setSystemMetrics] = useState(null)
  const [canisterStatus, setCanisterStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadSystemData()
    if (autoRefresh) {
      const interval = setInterval(loadSystemData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadSystemData = async () => {
    try {
      setLoading(true)
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      // Load Timer Health
      const timer = Actor.createActor(timerIdl, { agent, canisterId: TimerCanister })
      const [health, status, metrics] = await Promise.all([
        timer.get_canister_health(),
        timer.get_canister_status(),
        timer.get_system_metrics()
      ])

      setTimerHealth(health)
      setCanisterStatus(status)
      setSystemMetrics(metrics)

      // Load License Registry Stats
      const licenseRegistry = Actor.createActor(licenseRegistryIdl, { agent, canisterId: LicenseRegistryCanister })
      const licenseStats = await licenseRegistry.get_registry_stats()
      setLicenseStats(licenseStats)

      setLoading(false)
    } catch (err) {
      console.error('Failed to load system data:', err)
      setError('Failed to load system monitoring data. Check console for details.')
      setLoading(false)
    }
  }

  const handleEmergencyPauseAll = async () => {
    if (!confirm('⚠️ EMERGENCY ACTION: This will pause ALL subscriptions. Are you sure?')) {
      return
    }

    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const timer = Actor.createActor(timerIdl, { agent, canisterId: TimerCanister })
      const result = await timer.emergency_pause_all()

      if ('ok' in result) {
        alert(`✅ Emergency pause completed! Paused ${result.ok} subscriptions.`)
        loadSystemData()
      } else {
        alert(`❌ Emergency pause failed: ${result.err}`)
      }
    } catch (err) {
      console.error('Emergency pause error:', err)
      alert('Failed to execute emergency pause. Check console for details.')
    }
  }

  const handleResumeOperations = async () => {
    if (!confirm('Resume all operations? This will reactivate paused subscriptions.')) {
      return
    }

    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const timer = Actor.createActor(timerIdl, { agent, canisterId: TimerCanister })
      const result = await timer.resume_operations()

      if ('ok' in result) {
        alert(`✅ Operations resumed! Reactivated ${result.ok} subscriptions.`)
        loadSystemData()
      } else {
        alert(`❌ Resume operations failed: ${result.err}`)
      }
    } catch (err) {
      console.error('Resume operations error:', err)
      alert('Failed to resume operations. Check console for details.')
    }
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'Healthy': return '#22c55e'
      case 'Degraded': return '#f59e0b'
      case 'Critical': return '#ef4444'
      default: return '#64748b'
    }
  }

  const getHealthIcon = (status) => {
    switch (status) {
      case 'Healthy': return '💚'
      case 'Degraded': return '💛'
      case 'Critical': return '❤️'
      default: return '⚪'
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
        <div style={{ color: '#9ca3af' }}>Loading system monitoring data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>❌</div>
        <div style={{ color: '#ef4444' }}>{error}</div>
        <button
          className="btn btn-primary"
          onClick={loadSystemData}
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, color: '#1f2937' }}>🖥️ System Monitoring</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button
            className="btn btn-secondary"
            onClick={loadSystemData}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Emergency Controls */}
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, color: '#dc2626' }}>⚠️ Emergency Controls</h3>
        <p style={{ color: '#7f1d1d', marginBottom: '1rem' }}>
          These actions affect ALL subscriptions and should only be used in emergencies.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-danger"
            onClick={handleEmergencyPauseAll}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            🛑 Emergency Pause All
          </button>
          <button
            className="btn btn-warning"
            onClick={handleResumeOperations}
            style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
          >
            ▶️ Resume Operations
          </button>
        </div>
      </div>

      {/* Canister Health Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Timer Canister Health */}
        {timerHealth && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid ' + getHealthColor(timerHealth.status.Healthy ? 'Healthy' : timerHealth.status.Degraded ? 'Degraded' : 'Critical'),
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>⏰ Timer Canister</h3>
              <div style={{ fontSize: '1.5rem' }}>
                {getHealthIcon(timerHealth.status.Healthy ? 'Healthy' : timerHealth.status.Degraded ? 'Degraded' : 'Critical')}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', color: getHealthColor(timerHealth.status.Healthy ? 'Healthy' : timerHealth.status.Degraded ? 'Degraded' : 'Critical') }}>
                {timerHealth.status.Healthy ? 'Healthy' : timerHealth.status.Degraded ? 'Degraded' : 'Critical'}
              </div>
              {timerHealth.degradation_reason && (
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {timerHealth.degradation_reason}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              <div><strong>Uptime:</strong> {Math.floor(timerHealth.uptime_seconds / 3600)}h {Math.floor((timerHealth.uptime_seconds % 3600) / 60)}m</div>
              <div><strong>Subscriptions:</strong> {timerHealth.subscription_count} total, {timerHealth.active_timers} active</div>
              <div><strong>Failed Payments:</strong> {timerHealth.failed_payments}</div>
              <div><strong>Cycle Balance:</strong> {(timerHealth.cycle_balance / 1000000000000).toFixed(2)}T cycles</div>
            </div>
          </div>
        )}

        {/* License Registry Stats */}
        {licenseStats && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>🔐 License Registry</h3>
              <div style={{ fontSize: '1.5rem' }}>💚</div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', color: '#22c55e' }}>Operational</div>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              <div><strong>Developers:</strong> {licenseStats.active_developers}/{licenseStats.total_developers} active</div>
              <div><strong>API Keys:</strong> {licenseStats.total_api_keys}</div>
              <div><strong>Subscriptions:</strong> {licenseStats.total_subscriptions}</div>
              <div><strong>Tier Distribution:</strong></div>
              <div style={{ paddingLeft: '1rem' }}>
                • Community: {licenseStats.community_users}<br/>
                • Beta: {licenseStats.beta_users}<br/>
                • Enterprise: {licenseStats.enterprise_users}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>📊 System Metrics</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {systemMetrics.total_subscriptions}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Subscriptions</div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
                {systemMetrics.active_subscriptions}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Subscriptions</div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏸️</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {systemMetrics.paused_subscriptions}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Paused Subscriptions</div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {Math.floor(systemMetrics.uptime_seconds / 3600)}h
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>System Uptime</div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💳</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {systemMetrics.total_payments_processed}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Payments Processed</div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                {(systemMetrics.cycle_balance_estimate / 1000000000000).toFixed(2)}T
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Cycles Available</div>
            </div>
          </div>
        </div>
      )}

      {/* Canister Status Details */}
      {canisterStatus && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>🔧 Canister Status</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <strong>Initialization:</strong> {canisterStatus.is_initialized ? '✅ Initialized' : '❌ Not Initialized'}
            </div>
            <div>
              <strong>Main Wallet:</strong> {canisterStatus.main_wallet.slice(0, 20)}...
            </div>
            <div>
              <strong>Fee Wallet:</strong> {canisterStatus.fee_wallet.slice(0, 20)}...
            </div>
            <div>
              <strong>Ed25519 Key:</strong> {canisterStatus.ed25519_key_name}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}