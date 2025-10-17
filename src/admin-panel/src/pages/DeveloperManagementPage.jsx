import React, { useState, useEffect } from 'react'
import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { idlFactory as licenseRegistryIdl } from '../../canisters/LicenseRegistry.did.js'

const LicenseRegistryCanister = process.env.CANISTER_ID_LICENSE_REGISTRY || 'ucwa4-rx777-77774-qaada-cai'

export default function DeveloperManagementPage() {
  const [developers, setDevelopers] = useState([])
  const [selectedDeveloper, setSelectedDeveloper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState('all')

  useEffect(() => {
    loadDevelopers()
  }, [])

  const loadDevelopers = async () => {
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

      // Note: In a real implementation, you'd need a method to list all developers
      // For now, we'll show the registry stats and search functionality
      const stats = await licenseRegistry.get_registry_stats()

      // Mock data for demonstration - replace with actual implementation
      const mockDevelopers = [
        {
          id: 'npfah-vwoik-mflcp-omami-34o5z-blm5n-zsvsh-hxfog-lbis4-4ghxs-qqe',
          name: 'Test Developer',
          email: 'test@ouro-c.com',
          tier: 'Community',
          created_at: Date.now() * 1000000, // Convert to nanoseconds
          last_active: Date.now() * 1000000,
          is_active: true,
          usage_stats: {
            subscriptions_created: 0,
            subscriptions_active: 0,
            payments_processed: 0,
            last_payment: null,
            monthly_usage: []
          },
          api_keys: ['ouro_1234567890_123456_7890']
        }
      ]

      setDevelopers(mockDevelopers)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load developers:', err)
      setError('Failed to load developers. Check console for details.')
      setLoading(false)
    }
  }

  const loadDeveloperDetails = async (developerId) => {
    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const licenseRegistry = Actor.createActor(licenseRegistryIdl, {
        agent,
        canisterId: LicenseRegistryCanister
      })

      const result = await licenseRegistry.get_developer_info(Principal.fromText(developerId))
      if ('ok' in result) {
        setSelectedDeveloper(result.ok)
      } else {
        alert(`Failed to load developer details: ${result.err}`)
      }
    } catch (err) {
      console.error('Failed to load developer details:', err)
      alert('Failed to load developer details. Check console for details.')
    }
  }

  const handleDeactivateDeveloper = async (developerId) => {
    if (!confirm('Are you sure you want to deactivate this developer? This will revoke all their API keys.')) {
      return
    }

    try {
      // In a real implementation, you'd call a deactivate_developer method
      alert('Developer deactivation functionality would be implemented here')
      loadDevelopers()
    } catch (err) {
      console.error('Failed to deactivate developer:', err)
      alert('Failed to deactivate developer. Check console for details.')
    }
  }

  const handleRevokeApiKey = async (apiKey) => {
    if (!confirm('Are you sure you want to revoke this API key?')) {
      return
    }

    try {
      const agent = new HttpAgent({ host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4944' })
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey()
      }

      const licenseRegistry = Actor.createActor(licenseRegistryIdl, {
        agent,
        canisterId: LicenseRegistryCanister
      })

      const result = await licenseRegistry.revoke_api_key(apiKey)
      if ('ok' in result) {
        alert('API key revoked successfully!')
        if (selectedDeveloper) {
          loadDeveloperDetails(selectedDeveloper.id)
        }
        loadDevelopers()
      } else {
        alert(`Failed to revoke API key: ${result.err}`)
      }
    } catch (err) {
      console.error('Failed to revoke API key:', err)
      alert('Failed to revoke API key. Check console for details.')
    }
  }

  const filteredDevelopers = developers.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dev.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dev.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = filterTier === 'all' || dev.tier.toLowerCase() === filterTier.toLowerCase()
    return matchesSearch && matchesTier
  })

  const getTierColor = (tier) => {
    switch (tier.toLowerCase()) {
      case 'community': return '#22c55e'
      case 'beta': return '#8b5cf6'
      case 'enterprise': return '#ef4444'
      default: return '#64748b'
    }
  }

  const getTierIcon = (tier) => {
    switch (tier.toLowerCase()) {
      case 'community': return '🌱'
      case 'beta': return '🧪'
      case 'enterprise': return '🏢'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
        <div style={{ color: '#9ca3af' }}>Loading developer data...</div>
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
          onClick={loadDevelopers}
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
        <h2 style={{ margin: 0, color: '#1f2937' }}>👥 Developer Management</h2>
        <button
          className="btn btn-secondary"
          onClick={loadDevelopers}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search by name, email, or principal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="form-input"
            style={{ width: '200px' }}
          >
            <option value="all">All Tiers</option>
            <option value="community">Community</option>
            <option value="beta">Beta</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Developers List */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, color: '#1f2937' }}>Registered Developers ({filteredDevelopers.length})</h3>

        {filteredDevelopers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            No developers found matching your criteria.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {filteredDevelopers.map((developer) => (
              <div
                key={developer.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => loadDeveloperDetails(developer.id)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {getTierIcon(developer.tier)}
                      </span>
                      <span style={{
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {developer.name}
                      </span>
                      <span style={{
                        backgroundColor: getTierColor(developer.tier),
                        color: '#fff',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {developer.tier}
                      </span>
                      {developer.is_active ? (
                        <span style={{
                          backgroundColor: '#22c55e',
                          color: '#fff',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Active
                        </span>
                      ) : (
                        <span style={{
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      <div>📧 {developer.email}</div>
                      <div>🆔 {developer.id.slice(0, 20)}...</div>
                      <div>📅 Joined: {new Date(Number(developer.created_at) / 1000000).toLocaleDateString()}</div>
                      <div>📊 {developer.usage_stats.subscriptions_created} subscriptions created</div>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeactivateDeveloper(developer.id)
                    }}
                    style={{ fontSize: '0.875rem' }}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Developer Details Modal */}
      {selectedDeveloper && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>
                Developer Details: {selectedDeveloper.name}
              </h3>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedDeveloper(null)}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gap: '1.5rem'
            }}>
              {/* Basic Info */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Basic Information</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.875rem'
                }}>
                  <div><strong>Name:</strong> {selectedDeveloper.name}</div>
                  <div><strong>Email:</strong> {selectedDeveloper.email}</div>
                  <div><strong>Tier:</strong> {selectedDeveloper.tier}</div>
                  <div><strong>Status:</strong> {selectedDeveloper.is_active ? 'Active' : 'Inactive'}</div>
                  <div><strong>Principal:</strong> {selectedDeveloper.id}</div>
                  <div><strong>Joined:</strong> {new Date(Number(selectedDeveloper.created_at) / 1000000).toLocaleString()}</div>
                  <div><strong>Last Active:</strong> {new Date(Number(selectedDeveloper.last_active) / 1000000).toLocaleString()}</div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Usage Statistics</h4>
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
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {selectedDeveloper.usage_stats.subscriptions_created}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Subscriptions Created
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {selectedDeveloper.usage_stats.subscriptions_active}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Active Subscriptions
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                      {selectedDeveloper.usage_stats.payments_processed}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Payments Processed
                    </div>
                  </div>
                </div>
              </div>

              {/* API Keys */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>API Keys</h4>
                {selectedDeveloper.api_keys.length === 0 ? (
                  <div style={{ color: '#64748b' }}>No API keys found.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {selectedDeveloper.api_keys.map((apiKey, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {apiKey}
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRevokeApiKey(apiKey)}
                          style={{ fontSize: '0.75rem' }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}