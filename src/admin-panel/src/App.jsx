import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import DashboardPage from './pages/DashboardPage'

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
      <Routes>
        <Route
          path="/"
          element={
            authenticated ? (
              <DashboardPage onLogout={logout} />
            ) : (
              <Login onLoginII={loginII} onLoginNFID={loginNFID} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
