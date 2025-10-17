import React, { useState, useEffect } from 'react'
import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { idlFactory as licenseRegistryIdl } from '../../canisters/LicenseRegistry.did.js'
import ApiKeyManager from '../components/ApiKeyManager'

const LicenseRegistryCanister = process.env.CANISTER_ID_LICENSE_REGISTRY || 'ucwa4-rx777-77774-qaada-cai'

export default function LicenseManagementPage() {
  const [stats, setStats] = useState(null)
  const [developers, setDevelopers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [newDeveloper, setNewDeveloper] = useState({
    name: '',
    email: '',
    tier: 'Community',
    project_description: ''
  })

  useEffect(() => {
    loadLicenseData()
  }, [])

  const loadLicenseData = async () => {
    try {
      setLoading(true)
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const licenseRegistry = Actor.createActor(licenseRegistryIdl, {
        agent,
        canisterId: LicenseRegistryCanister
      })

      // Load registry stats
      const registryStats = await licenseRegistry.get_registry_stats()
      setStats(registryStats)

      // Load developers (in a real implementation, you'd need a method to list all developers)
      // For now, we'll show the stats only
      setLoading(false)
    } catch (err) {
      console.error('Failed to load license data:', err)
      setError('Failed to load license data. Make sure you are authenticated as an admin.')
      setLoading(false)
    }
  }

  const handleRegisterDeveloper = async (e) => {
    e.preventDefault()
    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const licenseRegistry = Actor.createActor(licenseRegistryIdl, {
        agent,
        canisterId: LicenseRegistryCanister
      })

      const request = {
        name: newDeveloper.name,
        email: newDeveloper.email,
        tier: { [newDeveloper.tier.toLowerCase()]: null },
        project_description: newDeveloper.project_description
      }

      const result = await licenseRegistry.register_developer(request)
      if ('ok' in result) {
        alert(`Developer registered successfully! API Key: ${result.ok.api_key}`)
        setNewDeveloper({ name: '', email: '', tier: 'Community', project_description: '' })
        setShowRegisterForm(false)
        loadLicenseData()
      } else {
        alert(`Registration failed: ${result.err}`)
      }
    } catch (err) {
      console.error('Registration error:', err)
      alert('Failed to register developer. Check console for details.')
    }
  }

  const handleAddAdmin = async () => {
    const principal = prompt('Enter principal to add as admin:')
    if (!principal) return

    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const licenseRegistry = Actor.createActor(licenseRegistryIdl, {
        agent,
        canisterId: LicenseRegistryCanister
      })

      const result = await licenseRegistry.add_admin(Principal.fromText(principal))
      if ('ok' in result) {
        alert('Admin added successfully!')
      } else {
        alert(`Failed to add admin: ${result.err}`)
      }
    } catch (err) {
      console.error('Add admin error:', err)
      alert('Failed to add admin. Check console for details.')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
        <div style={{ color: '#9ca3af' }}>Loading license management data...</div>
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
          onClick={loadLicenseData}
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
        <h2 style={{ margin: 0, color: '#1f2937' }}>🔐 License Management</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowRegisterForm(!showRegisterForm)}
          >
            ➕ Register Developer
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleAddAdmin}
          >
            👥 Add Admin
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadLicenseData}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Registration Form */}
      {showRegisterForm && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>Register New Developer</h3>
          <form onSubmit={handleRegisterDeveloper}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newDeveloper.name}
                  onChange={(e) => setNewDeveloper({...newDeveloper, name: e.target.value})}
                  className="form-input"
                  placeholder="Developer name"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newDeveloper.email}
                  onChange={(e) => setNewDeveloper({...newDeveloper, email: e.target.value})}
                  className="form-input"
                  placeholder="developer@example.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  License Tier *
                </label>
                <select
                  value={newDeveloper.tier}
                  onChange={(e) => setNewDeveloper({...newDeveloper, tier: e.target.value})}
                  className="form-input"
                >
                  <option value="Community">Community (10 API calls/hr, 10 subscriptions)</option>
                  <option value="Beta">Beta (50 API calls/hr, 100 subscriptions)</option>
                  <option value="Business">Business (100 API calls/hr, 1000 subscriptions) - Web Crypto</option>
                  <option value="Enterprise">Enterprise (1000 API calls/hr, 10000 subscriptions) - Arcium MXE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Project Description * (min 10 characters)
                </label>
                <textarea
                  required
                  minLength={10}
                  value={newDeveloper.project_description}
                  onChange={(e) => setNewDeveloper({...newDeveloper, project_description: e.target.value})}
                  className="form-input"
                  rows={3}
                  placeholder="Describe the project and intended use of Ouro-C..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRegisterForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Developer
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Registry Statistics */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0ea5e9' }}>
              {stats.total_developers}
            </div>
            <div style={{ color: '#64748b' }}>Total Developers</div>
          </div>

          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
              {stats.active_developers}
            </div>
            <div style={{ color: '#64748b' }}>Active Developers</div>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔑</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.total_api_keys}
            </div>
            <div style={{ color: '#64748b' }}>API Keys</div>
          </div>

          <div style={{
            backgroundColor: '#ede9fe',
            border: '1px solid #8b5cf6',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
              {stats.total_subscriptions}
            </div>
            <div style={{ color: '#64748b' }}>Total Subscriptions</div>
          </div>
        </div>
      )}

      {/* Tier Distribution */}
      {stats && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#1f2937' }}>Tier Distribution</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                🌱 Community
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                {stats.community_users}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                10 API calls/hr, 10 subscriptions max
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                🧪 Beta
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7c3aed' }}>
                {stats.beta_users}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                50 API calls/hr, 100 subscriptions max
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                💼 Business
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0891b2' }}>
                {stats.business_users}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                100 API calls/hr, 1000 subscriptions max
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Web Crypto API encryption
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                🏢 Enterprise
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                {stats.enterprise_users}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                1000 API calls/hr, 10000 subscriptions max
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Arcium MXE confidential computing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Management */}
      <ApiKeyManager />
    </div>
  )
}