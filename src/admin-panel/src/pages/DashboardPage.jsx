import { useState, useEffect } from 'react'
import {
  getCanisterHealth,
  getSystemMetrics,
  getNetworkConfig,
  getWalletAddresses,
  emergencyPauseAll,
  getCurrentPrincipal
} from '../utils/icp'

export default function DashboardPage({ onLogout }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [principalId, setPrincipalId] = useState('')
  const [data, setData] = useState({
    health: null,
    metrics: null,
    network: null,
    addresses: null
  })
  const [showModal, setShowModal] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)

  useEffect(() => {
    loadData()
    loadPrincipal()
    const interval = setInterval(loadData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadPrincipal() {
    try {
      const principal = await getCurrentPrincipal()
      setPrincipalId(principal)
    } catch (err) {
      console.error('Failed to load principal:', err)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [health, metrics, network, addresses] = await Promise.all([
        getCanisterHealth().catch(e => ({ error: e.message })),
        getSystemMetrics().catch(e => ({ error: e.message })),
        getNetworkConfig().catch(e => ({ error: e.message })),
        getWalletAddresses().catch(e => ({ error: e.message }))
      ])

      setData({ health, metrics, network, addresses })
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmergencyPause() {
    try {
      setPauseLoading(true)
      const result = await emergencyPauseAll()
      if (result.ok !== undefined) {
        alert(`Emergency pause successful! Paused ${result.ok} subscriptions.`)
      } else {
        alert(`Emergency pause failed: ${result.err}`)
      }
      setShowModal(false)
      await loadData()
    } catch (err) {
      console.error('Emergency pause failed:', err)
      alert(`Emergency pause failed: ${err.message}`)
    } finally {
      setPauseLoading(false)
    }
  }

  function formatUptime(seconds) {
    const days = Math.floor(Number(seconds) / 86400)
    const hours = Math.floor((Number(seconds) % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  function formatBalance(balance) {
    return (Number(balance) / 1e6).toFixed(2)
  }

  function formatCycles(cycles) {
    return (Number(cycles) / 1e12).toFixed(2)
  }

  function getStatusClass(status) {
    if (!status) return ''
    if (status.Healthy !== undefined) return 'status-healthy'
    if (status.Degraded !== undefined) return 'status-degraded'
    if (status.Critical !== undefined) return 'status-critical'
    if (status.Offline !== undefined) return 'status-offline'
    return ''
  }

  function getStatusText(status) {
    if (!status) return 'Unknown'
    if (status.Healthy !== undefined) return 'Healthy'
    if (status.Degraded !== undefined) return 'Degraded'
    if (status.Critical !== undefined) return 'Critical'
    if (status.Offline !== undefined) return 'Offline'
    return 'Unknown'
  }

  function getNetworkText(network) {
    if (!network) return 'Unknown'
    if (network.Mainnet !== undefined) return 'Mainnet'
    if (network.Devnet !== undefined) return 'Devnet'
    if (network.Testnet !== undefined) return 'Testnet'
    return 'Unknown'
  }

  if (loading && !data.health) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">⚙️ OuroC Admin</div>
          <p className="subtitle">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const { health, metrics, network, addresses } = data

  return (
    <div className="container">
      <div className="header">
        <div className="logo">⚙️ OuroC Admin</div>
        <p className="subtitle">Internet Computer Payment Infrastructure</p>
        {principalId && (
          <p style={{
            fontSize: '0.85rem',
            color: '#9ca3af',
            marginTop: '0.5rem',
            fontFamily: 'monospace'
          }}>
            🆔 Principal: {principalId}
          </p>
        )}
      </div>

      <div className="controls">
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-danger" onClick={() => setShowModal(true)}>
            🚨 Emergency Pause All
          </button>
          <button className="btn btn-secondary" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(245, 101, 101, 0.1)',
          border: '1px solid #f56565',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          color: '#f56565'
        }}>
          Error: {error}
        </div>
      )}

      {/* Health Stats */}
      <div className="stats-grid">
        <div className={`stat-card ${health?.is_degraded ? 'warning' : 'success'}`}>
          <div className="label">Canister Status</div>
          <div className={`value ${getStatusClass(health?.status)}`}>
            {getStatusText(health?.status)}
          </div>
          <div className="change">
            {health?.is_degraded && health?.degradation_reason?.[0]
              ? health.degradation_reason[0]
              : 'All systems operational'}
          </div>
        </div>

        <div className="stat-card success">
          <div className="label">Cycle Balance</div>
          <div className="value">{health ? formatCycles(health.cycle_balance) : '-'} T</div>
          <div className="change">
            {health ? `~${Math.floor(Number(health.cycle_balance) / 1e12 / 0.05)} days remaining` : '-'}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Active Subscriptions</div>
          <div className="value">
            {metrics ? Number(metrics.active_subscriptions) : '-'} / {metrics ? Number(metrics.total_subscriptions) : '-'}
          </div>
          <div className="change">
            {metrics && metrics.paused_subscriptions ? `${Number(metrics.paused_subscriptions)} paused` : '0 paused'}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">System Uptime</div>
          <div className="value">{health ? formatUptime(health.uptime_seconds) : '-'}</div>
          <div className="change">Since canister start</div>
        </div>

        <div className={`stat-card ${health && Number(health.failed_payments) > 10 ? 'warning' : ''}`}>
          <div className="label">Failed Payments</div>
          <div className="value">{health ? Number(health.failed_payments) : '-'}</div>
          <div className="change">Total failures</div>
        </div>

        <div className="stat-card">
          <div className="label">Active Timers</div>
          <div className="value">{health ? Number(health.active_timers) : '-'}</div>
          <div className="change">Running payment schedules</div>
        </div>

        <div className="stat-card">
          <div className="label">Memory Usage</div>
          <div className="value">
            {health ? (Number(health.memory_usage) / 1024 / 1024).toFixed(2) : '-'} MB
          </div>
          <div className="change">Current allocation</div>
        </div>

        <div className="stat-card">
          <div className="label">Payments Processed</div>
          <div className="value">{metrics ? Number(metrics.total_payments_processed) : '-'}</div>
          <div className="change">All-time total</div>
        </div>
      </div>

      {/* Wallet Information */}
      <div className="panel">
        <h2>💰 Wallet Information</h2>
        <table>
          <tbody>
            <tr>
              <td>Main Wallet</td>
              <td className="wallet-address">
                {addresses?.ok?.main || 'Loading...'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* System Metrics */}
      <div className="panel">
        <h2>📊 System Metrics</h2>
        <table>
          <tbody>
            <tr>
              <td>Total Subscriptions</td>
              <td>{metrics ? Number(metrics.total_subscriptions) : '-'}</td>
            </tr>
            <tr>
              <td>Active Subscriptions</td>
              <td>{metrics ? Number(metrics.active_subscriptions) : '-'}</td>
            </tr>
            <tr>
              <td>Paused Subscriptions</td>
              <td>{metrics ? Number(metrics.paused_subscriptions) : '-'}</td>
            </tr>
            <tr>
              <td>Failed Payment Count</td>
              <td>{metrics ? Number(metrics.failed_payment_count) : '-'}</td>
            </tr>
            <tr>
              <td>Uptime (seconds)</td>
              <td>{metrics ? Number(metrics.uptime_seconds) : '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Network Configuration */}
      <div className="panel">
        <h2>🌐 Network Configuration</h2>
        <table>
          <tbody>
            <tr>
              <td>Network</td>
              <td>{network ? getNetworkText(network.network) : 'Loading...'}</td>
            </tr>
            <tr>
              <td>RPC Endpoint</td>
              <td className="wallet-address">{network?.rpc_endpoint || 'Loading...'}</td>
            </tr>
            <tr>
              <td>Keypair Name</td>
              <td>{network?.keypair_name || 'Loading...'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Emergency Pause Modal */}
      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <h3>⚠️ Emergency Pause All Subscriptions</h3>
            <p>
              This will immediately pause ALL active subscriptions. This action should only be used in critical situations.
              Are you sure you want to continue?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={pauseLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleEmergencyPause}
                disabled={pauseLoading}
              >
                {pauseLoading ? 'Pausing...' : 'Yes, Pause All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
