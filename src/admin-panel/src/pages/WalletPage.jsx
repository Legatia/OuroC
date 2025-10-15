import { useState, useEffect } from 'react'
import {
  getComprehensiveWalletInfo,
  getNetworkConfig,
  adminWithdrawSol,
  adminWithdrawToken
} from '../utils/icp'

export default function WalletPage({ onLogout }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [walletInfo, setWalletInfo] = useState(null)
  const [network, setNetwork] = useState(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawType, setWithdrawType] = useState('sol') // 'sol' or 'token'
  const [withdrawForm, setWithdrawForm] = useState({
    fromWallet: 'main',
    recipient: '',
    amount: '',
    tokenMint: '',
    recipientTokenAccount: ''
  })
  const [withdrawing, setWithdrawing] = useState(false)

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
        getComprehensiveWalletInfo().catch(e => ({ error: e.message })),
        getNetworkConfig().catch(e => ({ error: e.message }))
      ])

      if (walletData.ok) {
        setWalletInfo(walletData.ok)
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

  async function handleWithdraw() {
    try {
      setWithdrawing(true)
      setError(null)

      let result
      if (withdrawType === 'sol') {
        // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
        const lamports = Math.floor(parseFloat(withdrawForm.amount) * 1_000_000_000)
        result = await adminWithdrawSol(
          withdrawForm.fromWallet,
          withdrawForm.recipient,
          lamports
        )
      } else {
        // Token withdrawal
        result = await adminWithdrawToken(
          withdrawForm.fromWallet,
          withdrawForm.tokenMint,
          withdrawForm.recipientTokenAccount,
          parseInt(withdrawForm.amount)
        )
      }

      if (result.ok) {
        alert(`Withdrawal successful! Transaction: ${result.ok}`)
        setShowWithdrawModal(false)
        setWithdrawForm({
          fromWallet: 'main',
          recipient: '',
          amount: '',
          tokenMint: '',
          recipientTokenAccount: ''
        })
        await loadWalletData()
      } else {
        alert(`Withdrawal failed: ${result.err}`)
      }
    } catch (err) {
      console.error('Withdrawal failed:', err)
      alert(`Withdrawal failed: ${err.message}`)
    } finally {
      setWithdrawing(false)
    }
  }

  function formatBalance(balance, decimals = 6) {
    return (Number(balance) / Math.pow(10, decimals)).toFixed(decimals)
  }

  function formatSolBalance(lamports) {
    return (Number(lamports) / 1e9).toFixed(4)
  }

  function getNetworkText(network) {
    if (!network) return 'Unknown'
    if (network.Mainnet !== undefined) return 'Mainnet'
    if (network.Devnet !== undefined) return 'Devnet'
    if (network.Testnet !== undefined) return 'Testnet'
    return 'Unknown'
  }

  function getTokenName(mint) {
    const knownTokens = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': 'USDT (Legacy)',
      '7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT': 'UXD',
      'CXLBjMMcwkc17GfJtBos6rQCo1ypeH6eDbB82Kby4MRm': 'PYTH'
    }
    return knownTokens[mint] || `${mint.substring(0, 4)}...${mint.substring(mint.length - 4)}`
  }

  if (loading && !walletInfo) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">💼 Wallet Management</div>
          <p className="subtitle">Loading wallet data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">💼 Wallet Management</div>
        <p className="subtitle">Solana Wallet Control Panel</p>
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setWithdrawType('sol')
              setShowWithdrawModal(true)
            }}
          >
            📤 Withdraw SOL
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setWithdrawType('token')
              setShowWithdrawModal(true)
            }}
          >
            📤 Withdraw Token
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

      {/* SOL Balances */}
      {walletInfo && (
        <>
          <div className="panel">
            <h2>💰 SOL Balances</h2>
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Address</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Main Wallet</td>
                  <td className="wallet-address">{walletInfo.addresses.main}</td>
                  <td>{formatSolBalance(walletInfo.sol_balances.main)} SOL</td>
                </tr>
                <tr>
                  <td>Fee Collection</td>
                  <td className="wallet-address">{walletInfo.addresses.fee_collection}</td>
                  <td>{formatSolBalance(walletInfo.sol_balances.fee_collection)} SOL</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Token Balances */}
          <div className="panel">
            <h2>🪙 Token Balances</h2>
            {walletInfo.tokens && walletInfo.tokens.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Mint Address</th>
                    <th>Main Wallet</th>
                    <th>Fee Collection</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {walletInfo.tokens.map((token, idx) => (
                    <tr key={idx}>
                      <td>{getTokenName(token.mint)}</td>
                      <td className="wallet-address">{token.mint}</td>
                      <td>{formatBalance(token.main_balance, token.decimals)}</td>
                      <td>{formatBalance(token.fee_balance, token.decimals)}</td>
                      <td style={{ fontWeight: 'bold' }}>
                        {formatBalance(Number(token.main_balance) + Number(token.fee_balance), token.decimals)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                No token accounts found
              </p>
            )}
          </div>
        </>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal active">
          <div className="modal-content">
            <h3>📤 {withdrawType === 'sol' ? 'Withdraw SOL' : 'Withdraw Token'}</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                From Wallet:
              </label>
              <select
                value={withdrawForm.fromWallet}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, fromWallet: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  background: '#1f2937',
                  color: '#fff'
                }}
              >
                <option value="main">Main Wallet</option>
                <option value="fee">Fee Collection</option>
              </select>
            </div>

            {withdrawType === 'sol' ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                    Recipient Address:
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.recipient}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, recipient: e.target.value })}
                    placeholder="Solana address"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      background: '#1f2937',
                      color: '#fff',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                    Amount (SOL):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    placeholder="0.001"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      background: '#1f2937',
                      color: '#fff'
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                    Token Mint Address:
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.tokenMint}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, tokenMint: e.target.value })}
                    placeholder="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      background: '#1f2937',
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                    Recipient Token Account:
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.recipientTokenAccount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, recipientTokenAccount: e.target.value })}
                    placeholder="Token account address"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      background: '#1f2937',
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>
                    Amount (raw, with decimals):
                  </label>
                  <input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    placeholder="1000000 (for 1 USDC with 6 decimals)"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      background: '#1f2937',
                      color: '#fff'
                    }}
                  />
                  <small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    Enter the raw amount including decimals (e.g., 1000000 for 1 USDC)
                  </small>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawForm({
                    fromWallet: 'main',
                    recipient: '',
                    amount: '',
                    tokenMint: '',
                    recipientTokenAccount: ''
                  })
                }}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawForm.amount}
              >
                {withdrawing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
