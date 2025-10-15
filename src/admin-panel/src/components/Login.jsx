import { useState } from 'react'

export default function Login({ onLoginII, onLoginNFID }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(loginFn, provider) {
    try {
      setLoading(true)
      setError(null)
      await loginFn()
    } catch (err) {
      console.error(`${provider} login error:`, err)
      setError(err.message || `${provider} login failed`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">🔐 OuroC Admin</div>
        <p className="subtitle">Internet Computer Payment Infrastructure</p>
      </div>

      <div className="login-card">
        <h2>Admin Login</h2>
        <p>Choose your authentication method to access the admin dashboard</p>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Your principal ID will be shown in the browser console after login
        </p>
        {error && <p style={{ color: '#f56565', marginBottom: '1rem' }}>{error}</p>}

        <button
          className="btn"
          onClick={() => handleLogin(onLoginII, 'Internet Identity')}
          disabled={loading}
          style={{ marginBottom: '1rem' }}
        >
          {loading ? 'Connecting...' : 'Login with Internet Identity'}
        </button>

        <button
          className="btn"
          onClick={() => handleLogin(onLoginNFID, 'NFID')}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
          }}
        >
          {loading ? 'Connecting...' : 'Login with NFID'}
        </button>

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.85rem',
          color: '#9ca3af'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>💡 <strong>Internet Identity:</strong> Easier to get principal for testing</p>
          <p><strong>NFID:</strong> Better UX with email/biometric login</p>
        </div>
      </div>
    </div>
  )
}
