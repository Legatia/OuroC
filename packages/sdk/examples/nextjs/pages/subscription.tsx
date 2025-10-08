import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { SubscriptionCard, createSubscriptionCard } from '@OuroC/react-sdk'

// Create a pre-configured subscription card for your dApp
const MySubscriptionCard = createSubscriptionCard(
  'YourDAppWalletAddressHere123456789012345678901', // Your dApp's SOL receiving address
  'Premium subscription to MyDApp' // Default metadata
)

export default function SubscriptionPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1>Choose Your Plan</h1>
        <p>Select the perfect subscription for your needs</p>
        <WalletMultiButton />
      </header>

      {/* Pricing Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}
      >
        {/* Basic Plan */}
        <SubscriptionCard
          planName="Basic"
          price={0.05} // 0.05 SOL per month
          interval="monthly"
          features={[
            'Access to basic features',
            'Email support',
            '1 project',
            'Basic analytics'
          ]}
          onSubscribe={async (plan) => {
            console.log('Subscribing to:', plan)
            // Custom subscription logic here
          }}
        />

        {/* Popular Plan */}
        <MySubscriptionCard
          planName="Premium"
          price={0.15} // 0.15 SOL per month
          interval="monthly"
          features={[
            'All basic features',
            'Priority support',
            '10 projects',
            'Advanced analytics',
            'API access'
          ]}
          popular={true}
        />

        {/* Enterprise Plan */}
        <MySubscriptionCard
          planName="Enterprise"
          price={1.5} // 1.5 SOL per year
          interval="yearly"
          features={[
            'All premium features',
            'Dedicated support',
            'Unlimited projects',
            'Custom integrations',
            'White-label options'
          ]}
        />
      </div>

      {/* Custom Interval Example */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Custom Plans</h2>
        <MySubscriptionCard
          planName="Weekly Premium"
          price={0.04} // 0.04 SOL per week
          interval="weekly"
          customInterval={7 * 24 * 60 * 60} // 1 week in seconds
          features={[
            'Perfect for short-term projects',
            'Weekly billing',
            'Full premium features',
            'Cancel anytime'
          ]}
        />
      </div>

      {/* Benefits Section */}
      <section
        style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center'
        }}
      >
        <h2>Why Choose OuroC Subscriptions?</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}
        >
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <h3>Secure & Trustless</h3>
            <p>Powered by ICP and Solana blockchain technology</p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
            <h3>Automatic Payments</h3>
            <p>Never worry about manual renewals again</p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔔</div>
            <h3>Smart Notifications</h3>
            <p>Get reminded before payments via email, Discord, or Slack</p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💰</div>
            <h3>Low Fees</h3>
            <p>Minimal transaction costs on Solana</p>
          </div>
        </div>
      </section>
    </div>
  )
}