import { useState, useEffect } from 'react'
import {
  getWalletAddresses,
  getNetworkConfig
} from '../utils/icp'

export default function WalletPage({ onLogout }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [network, setNetwork] = useState(null)

  useEffect(() => {
    loadWalletData()
    const interval = setInterval(loadWalletData, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function loadWalletData() {
    try {
      setLoading(true)
      setError(null)

      const [walletData, networkData] = await Promise.all([
        getWalletAddresses().catch(e => ({ error: e.message })),
        getNetworkConfig().catch(e => ({ error: e.message }))
      ])

      if (walletData.ok) {
        setWalletAddress(walletData.ok.main)
      } else if (walletData.err) {
        setError(walletData.err)
      }

      setNetwork(networkData)
    } catch (err) {
      console.error('Failed to load wallet data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getNetworkText(network) {
    if (!network) return 'Unknown'
    if (network.Mainnet !== undefined) return 'Mainnet'
    if (network.Devnet !== undefined) return 'Devnet'
    if (network.Testnet !== undefined) return 'Testnet'
    return 'Unknown'
  }

  if (loading && !walletAddress) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">💼 Wallet Information</div>
          <p className="subtitle">Loading wallet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">💼 Wallet Information</div>
        <p className="subtitle">ICP-Controlled Solana Wallet</p>
        {network && (
          <p style={{
            fontSize: '0.9rem',
            color: network.network && getNetworkText(network.network) === 'Mainnet' ? '#10b981' : '#f59e0b',
            marginTop: '0.5rem',
            fontWeight: 'bold'
          }}>
            🌐 Network: {network.network ? getNetworkText(network.network) : 'Loading...'}
          </p>
        )}
      </div>

      <div className="controls">
        <button className="btn btn-secondary" onClick={loadWalletData} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
        <button className="btn btn-secondary" onClick={onLogout}>
          🚪 Logout
        </button>
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

      {/* Main Wallet Info */}
      {walletAddress && (
        <div className="panel">
          <h2>🔑 Main Wallet Address</h2>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <p style={{
              color: '#9ca3af',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}>
              ICP-Controlled Wallet (Threshold Ed25519)
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: '1rem',
              color: '#fff',
              wordBreak: 'break-all',
              marginBottom: '1rem'
            }}>
              {walletAddress}
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: '#9ca3af',
              marginTop: '1rem',
              lineHeight: '1.5'
            }}>
              ℹ️ This wallet is controlled by the ICP canister and handles all subscription payments.
              Fee collection is managed by an external wallet configured in the Solana contract.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
