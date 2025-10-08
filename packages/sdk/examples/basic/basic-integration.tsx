import React from 'react'
import {
  OuroCProvider,
  useSubscription,
  useOuroC,
  SubscriptionCard
} from '@OuroC/react-sdk'

// Example 1: Simple subscription card
function SimpleExample() {
  return (
    <SubscriptionCard
      planName="Premium Plan"
      price={0.1} // 0.1 SOL
      interval="monthly"
      features={[
        'Feature 1',
        'Feature 2',
        'Feature 3'
      ]}
      onSubscribe={async (plan) => {
        console.log('User wants to subscribe to:', plan)
        // Handle subscription creation
      }}
    />
  )
}

// Example 2: Custom UI using hooks
function CustomSubscriptionUI() {
  const { isConnected, connect, publicKey } = useOuroC()
  const {
    subscriptions,
    create,
    pause,
    resume,
    cancel,
    loading,
    error
  } = useSubscription()

  const handleCreateSubscription = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    try {
      const subscriptionId = await create({
        solana_payer: publicKey!.toBase58(),
        solana_receiver: 'YourDAppWalletAddress123456789',
        payment_amount: BigInt(100_000_000), // 0.1 SOL in lamports
        interval_seconds: BigInt(30 * 24 * 60 * 60), // 30 days
        metadata: 'Premium subscription'
      })

      console.log('Subscription created:', subscriptionId)
    } catch (error) {
      console.error('Failed to create subscription:', error)
    }
  }

  if (loading) {
    return <div>Loading subscriptions...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h2>My Subscriptions</h2>

      {!isConnected ? (
        <button onClick={connect}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>Connected: {publicKey?.toBase58()}</p>

          <button onClick={handleCreateSubscription}>
            Create New Subscription
          </button>

          <div style={{ marginTop: '2rem' }}>
            {subscriptions.length === 0 ? (
              <p>No subscriptions found</p>
            ) : (
              subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    border: '1px solid #ccc',
                    padding: '1rem',
                    margin: '1rem 0',
                    borderRadius: '8px'
                  }}
                >
                  <h3>Subscription {sub.id}</h3>
                  <p>Amount: {Number(sub.payment_amount) / 1_000_000_000} SOL</p>
                  <p>Status: {sub.is_active ? 'Active' : 'Inactive'}</p>
                  <p>Next Payment: {new Date(Number(sub.next_payment) / 1_000_000).toLocaleDateString()}</p>

                  <div style={{ marginTop: '1rem' }}>
                    {sub.is_active ? (
                      <button
                        onClick={() => pause(sub.id)}
                        style={{ marginRight: '1rem' }}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => resume(sub.id)}
                        style={{ marginRight: '1rem' }}
                      >
                        Resume
                      </button>
                    )}

                    <button
                      onClick={() => cancel(sub.id)}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Example 3: Complete app setup
function App() {
  return (
    <OuroCProvider
      canisterId="rdmx6-jaaaa-aaaah-qcaiq-cai" // Replace with your canister ID
      network="devnet"
      theme={{
        colors: {
          primary: '#9945FF',
          secondary: '#00D18C'
        }
      }}
      onSubscriptionCreate={(subscription) => {
        console.log('New subscription:', subscription)
        // Track analytics, show notification, etc.
      }}
      onError={(error, context) => {
        console.error(`Error in ${context}:`, error)
        // Send to error tracking service
      }}
    >
      <div style={{ padding: '2rem' }}>
        <h1>OuroC Integration Examples</h1>

        <section style={{ marginBottom: '3rem' }}>
          <h2>1. Simple Subscription Card</h2>
          <SimpleExample />
        </section>

        <section>
          <h2>2. Custom Subscription Management</h2>
          <CustomSubscriptionUI />
        </section>
      </div>
    </OuroCProvider>
  )
}

export default App