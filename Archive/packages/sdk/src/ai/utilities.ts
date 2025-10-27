/**
 * AI Agent Utility Functions
 *
 * Helper functions specifically designed for AI coding agents
 * to quickly implement OuroC SDK features with best practices.
 */

import { getIntervalSeconds } from '../utils';

/**
 * AI Agent Helper: Generate basic OuroC setup code
 */
export function generateBasicSetup(): string {
  return `// 1. Install the package
npm install @ouroc/sdk

// 2. Basic React component with OuroC
import { OuroCProvider, SubscriptionCard, useSubscription, getIntervalSeconds } from '@ouroc/sdk';

function App() {
  const { createSubscription, loading } = useSubscription();

  const handleSubscribe = async (plan) => {
    try {
      // Note: Requires actual subscription configuration from your backend
      const subscriptionId = await createSubscription({
        subscription_id: "your-subscription-id", // Required: Get from your service
        amount: plan.price, // Already in lamports
        intervalSeconds: getIntervalSeconds(plan.interval),
        plan_name: plan.planName,
        solana_contract_address: "your-solana-contract-address", // Required
        api_key: "your-api-key", // Required
        token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC devnet
      });

      console.log('Subscription created:', subscriptionId);
      // Handle success (grant access, update UI, send confirmation)
    } catch (error) {
      console.error('Subscription failed:', error);
      // Handle error appropriately
    }
  };

  return (
    <OuroCProvider network="devnet">
      <div className="app">
        <h1>My SaaS App</h1>
        <SubscriptionCard
          planName="Pro"
          price={29000000} // 0.029 SOL lamports
          interval="monthly"
          features={["AI Features", "Priority Support", "Advanced Analytics"]}
          onSubscribe={handleSubscribe}
        />
      </div>
    </OuroCProvider>
  );
}`;
}

/**
 * AI Agent Helper: Generate multi-tier pricing setup
 */
export function generateMultiTierPricing(): string {
  return `// Multi-tier SaaS pricing with OuroC
import { OuroCProvider, SubscriptionCard } from '@ouroc/sdk';

const pricingTiers = [
  {
    name: "Basic",
    price: 9000000, // 0.009 SOL lamports (~$9 USD)
    interval: "monthly",
    features: [
      "Up to 3 users",
      "Basic support",
      "Core features"
    ]
  },
  {
    name: "Pro",
    price: 29000000, // 0.029 SOL lamports (~$29 USD)
    interval: "monthly",
    features: [
      "Up to 10 users",
      "Priority support",
      "AI features",
      "Advanced analytics"
    ]
  },
  {
    name: "Enterprise",
    price: 99000000, // 0.099 SOL lamports (~$99 USD)
    interval: "monthly",
    features: [
      "Unlimited users",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Advanced features"
    ]
  }
];

function PricingPage() {
  const handleSubscription = async (tier) => {
    try {
      // AI agents should add proper implementation here
      console.log(\`Subscribed to \${tier.name} plan\`);
      // Add your business logic:
      // - Create user account
      // - Grant access to features
      // - Send confirmation email
      // - Update payment records
    } catch (error) {
      console.error('Subscription failed:', error);
      // Add error handling logic
    }
  };

  return (
    <OuroCProvider network="devnet">
      <div className="pricing-page">
        <h1>Choose Your Plan</h1>
        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <SubscriptionCard
              key={index}
              planName={tier.name}
              price={tier.price}
              interval={tier.interval}
              features={tier.features}
              popular={tier.name === "Pro"}
              onSubscribe={() => handleSubscription(tier)}
            />
          ))}
        </div>
      </div>
    </OuroCProvider>
  );
}`;
}

/**
 * AI Agent Helper: Generate subscription management dashboard
 */
export function generateSubscriptionDashboard(): string {
  return `// Subscription management dashboard with OuroC
import { OuroCProvider, useSubscription } from '@ouroc/sdk';

function UserDashboard() {
  const {
    subscriptions,
    pauseSubscription,
    cancelSubscription,
    resumeSubscription,
    loading
  } = useSubscription();

  const handlePause = async (subscriptionId) => {
    try {
      await pauseSubscription(subscriptionId);
      console.log('Subscription paused');
      // AI agents can add:
      // - Update UI state
      // - Send notification
      // - Log analytics event
    } catch (error) {
      console.error('Failed to pause subscription:', error);
    }
  };

  const handleCancel = async (subscriptionId) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await cancelSubscription(subscriptionId);
        console.log('Subscription cancelled');
        // AI agents can add:
        // - Update user access
        // - Process refund if applicable
        // - Send cancellation confirmation
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
      }
    }
  };

  return (
    <OuroCProvider network="devnet">
      <div className="dashboard">
        <h1>My Subscriptions</h1>

        {loading ? (
          <div>Loading subscriptions...</div>
        ) : (
          <div className="subscriptions-list">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="subscription-item">
                <h3>{subscription.planName}</h3>
                <p>Status: {subscription.status}</p>
                <p>Next payment: {new Date(subscription.nextPayment).toLocaleDateString()}</p>

                <div className="subscription-actions">
                  {subscription.status === 'active' && (
                    <button onClick={() => handlePause(subscription.id)}>
                      Pause
                    </button>
                  )}
                  {subscription.status === 'paused' && (
                    <button onClick={() => resumeSubscription(subscription.id)}>
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(subscription.id)}
                    className="danger"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OuroCProvider>
  );
}`;
}

/**
 * AI Agent Helper: Generate common error handling patterns
 */
export function generateErrorHandling(): string {
  return `// Error handling patterns for OuroC
import { OuroCProvider, useSubscription, useOuroC } from '@ouroc/sdk';

function App() {
  const { createSubscription, loading, error } = useSubscription();
  const { isConnected } = useOuroC();

  const handleSubscribe = async (plan) => {
    // 1. Check connection status
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    // 2. Check loading state
    if (loading) {
      console.log('Processing subscription...');
      return;
    }

    try {
      // 3. Create subscription
      const subscriptionId = await createSubscription({
        subscription_id: "your-subscription-id", // Required from backend
        amount: plan.price, // Already in lamports
        intervalSeconds: getIntervalSeconds(plan.interval),
        plan_name: plan.planName,
        solana_contract_address: "your-solana-contract-address", // Required
        api_key: "your-api-key", // Required
        token_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
      });

      console.log('Subscription created:', subscriptionId);
      // 4. Handle success
      // - Update UI
      // - Grant user access
      // - Send confirmation
      // - Track analytics

    } catch (error) {
      // 5. Handle different error types
      if (error.message.includes('insufficient balance')) {
        alert('Insufficient balance. Please add funds to your wallet.');
      } else if (error.message.includes('network')) {
        alert('Network error. Please check your connection and try again.');
      } else if (error.message.includes('invalid')) {
        alert('Invalid subscription details. Please check your input.');
      } else {
        console.error('Unexpected error:', error);
        alert('An error occurred. Please try again later.');
      }
    }
  };

  return (
    <OuroCProvider network="devnet">
      {/* Your app content */}
    </OuroCProvider>
  );
}`;
}

/**
 * AI Agent Helper: Get recommended project structure
 */
export function getProjectStructure(): string {
  return `// Recommended project structure for OuroC integration
my-saas-app/
├── src/
│   ├── components/
│   │   ├── SubscriptionCard.tsx      // Custom subscription cards
│   │   ├── UserDashboard.tsx        // User subscription management
│   │   └── PricingPage.tsx          // Pricing and plans
│   ├── hooks/
│   │   ├── useSubscriptionManager.ts // Custom subscription logic
│   │   └── usePaymentProcessing.ts   // Payment handling logic
│   ├── utils/
│   │   ├── pricing.ts               // Pricing calculations
│   │   └── validation.ts            // Input validation
│   ├── types/
│   │   └── subscription.ts          // TypeScript interfaces
│   └── App.tsx                     // Main app component
├── package.json
└── README.md

// Package.json dependencies
{
  "dependencies": {
    "@ouroc/sdk": "^1.0.0",
    "react": "^18.0.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/web3.js": "^1.87.0"
  }
}`;
}

/**
 * AI Agent Helper: Get troubleshooting checklist
 */
export function getTroubleshootingChecklist(): string {
  return `// OuroC Integration Troubleshooting Checklist

## ✅ Pre-Integration Checklist
1. Package installed: npm install @ouroc/sdk
2. Network set correctly (devnet for development)
3. Wallet adapter configured
4. Component imports correct

## ✅ Implementation Checklist
1. OuroCProvider wraps the app
2. SubscriptionCard has required props:
   - planName (string)
   - price (number, in lamports)
   - interval (string)
   - features (string array)
   - onSubscribe (function)
3. createSubscription requires complex parameters:
   - subscription_id (from backend)
   - amount (in lamports)
   - intervalSeconds (from getIntervalSeconds)
   - plan_name
   - solana_contract_address
   - api_key
   - token_mint
4. Wallet connection checks added
5. Error handling implemented
6. Loading states handled

## ✅ Common Issues & Solutions

### Issue: "Wallet not connected"
**Solution**: Add connection check
\`\`\`typescript
const { isConnected } = useOuroC();
if (!isConnected) return <ConnectWallet />;
\`\`\`

### Issue: "Invalid amount"
**Solution**: Use lamports (smallest unit)
\`\`\`tsx
<SubscriptionCard price={29000000} /> // ✅ Correct (0.029 SOL)
<SubscriptionCard price={29} /> // ❌ Wrong (whole dollars)
\`\`\`

### Issue: "Network error"
**Solution**: Check network configuration
\`\`\`tsx
<OuroCProvider network="devnet"> // Development
<OuroCProvider network="mainnet-beta"> // Production
\`\`\`

### Issue: "Component not found"
**Solution**: Check imports
\`\`\`typescript
import { OuroCProvider, SubscriptionCard } from '@ouroc/sdk';
\`\`\`

## 🧪 Testing Checklist
1. Component renders without errors
2. Subscription creation flow works
3. Wallet connection prompts appear
4. Error messages display correctly
5. Loading states show properly
6. Network requests succeed`;
}

/**
 * AI Agent Helper: Generate performance optimization tips
 */
export function getPerformanceOptimization(): string {
  return `// Performance Optimization Tips for OuroC

## 🚀 Component Optimization
\`\`\`tsx
// 1. Memoize subscription data
import { useMemo } from 'react';

function SubscriptionList({ subscriptions }) {
  const sortedSubscriptions = useMemo(() => {
    return subscriptions.sort((a, b) =>
      new Date(b.nextPayment) - new Date(a.nextPayment)
    );
  }, [subscriptions]);

  return (
    <div>
      {sortedSubscriptions.map(sub => (
        <SubscriptionCard key={sub.id} {...sub} />
      ))}
    </div>
  );
}

// 2. Lazy load dashboard components
import { lazy, Suspense } from 'react';

const UserDashboard = lazy(() => import('./UserDashboard'));

function App() {
  return (
    <OuroCProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <UserDashboard />
      </Suspense>
    </OuroCProvider>
  );
}

// 3. Optimize re-renders
import { useCallback } from 'react';

function PricingPage({ plans }) {
  const handleSubscribe = useCallback(async (plan) => {
    // Subscription logic
    await createSubscription(plan);
  }, []);

  return (
    <div>
      {plans.map(plan => (
        <SubscriptionCard
          key={plan.id}
          {...plan}
          onSubscribe={handleSubscribe}
        />
      ))}
    </div>
  );
}
\`\`\`

## 📊 Bundle Optimization
\`\`\`json
{
  "dependencies": {
    "@ouroc/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0"
  }
}
\`\`\`

## 🔧 Development Optimization
- Use React DevTools Profiler
- Implement error boundaries
- Add loading states
- Use React.memo for expensive components
- Implement proper key props in lists

## 🌐 Network Optimization
- Implement request caching
- Add retry logic for failed requests
- Use optimistic updates where appropriate
- Implement proper error boundaries`;
}

// Export all utilities for AI agents
export default {
  generateBasicSetup,
  generateMultiTierPricing,
  generateSubscriptionDashboard,
  generateErrorHandling,
  getProjectStructure,
  getTroubleshootingChecklist,
  getPerformanceOptimization
};