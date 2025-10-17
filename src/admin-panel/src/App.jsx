import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'
import LicenseManagementPage from './pages/LicenseManagementPage'
import SystemMonitoringPage from './pages/SystemMonitoringPage'
import DeveloperManagementPage from './pages/DeveloperManagementPage'

function Navigation({ onLogout }) {
  const location = useLocation()

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
      padding: '1rem 2rem',
      marginBottom: '2rem',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link
          to="/"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: location.pathname === '/' ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          📊 Dashboard
        </Link>
        <Link
          to="/wallet"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: location.pathname === '/wallet' ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          💼 Wallet
        </Link>
        <Link
          to="/licenses"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: location.pathname === '/licenses' ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          🔐 Licenses
        </Link>
        <Link
          to="/developers"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: location.pathname === '/developers' ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          👥 Developers
        </Link>
        <Link
          to="/monitoring"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: location.pathname === '/monitoring' ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: '#fff',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          🖥️ Monitoring
        </Link>
      </div>
      <button
        className="btn btn-secondary"
        onClick={onLogout}
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}
      >
        🚪 Logout
      </button>
    </nav>
  )
}

function AuthenticatedApp({ onLogout }) {
  return (
    <div className="container">
      <Navigation onLogout={onLogout} />
      <Routes>
        <Route path="/" element={<DashboardPage onLogout={onLogout} />} />
        <Route path="/wallet" element={<WalletPage onLogout={onLogout} />} />
        <Route path="/licenses" element={<LicenseManagementPage />} />
        <Route path="/developers" element={<DeveloperManagementPage />} />
        <Route path="/monitoring" element={<SystemMonitoringPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  const { authenticated, loading, loginII, loginNFID, logout } = useAuth()

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
        <div style={{ color: '#9ca3af' }}>Loading OuroC Admin...</div>
      </div>
    )
  }

  return (
    <Router>
      {authenticated ? (
        <AuthenticatedApp onLogout={logout} />
      ) : (
        <Routes>
          <Route path="*" element={<Login onLoginII={loginII} onLoginNFID={loginNFID} />} />
        </Routes>
      )}
    </Router>
  )
}

export default App
