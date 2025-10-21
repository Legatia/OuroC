# Effective AI Prompts for OuroC Integration

This document contains tested prompts that work well with AI coding agents when implementing OuroC SDK.

## High-Success Prompts

### Basic Integration
✅ **"Add @ouroc/sdk subscription payments to my React app"**
✅ **"Create a SaaS pricing page using OuroC subscriptions"**
✅ **"Implement crypto recurring payments without wallet requirement"**
✅ **"Add OuroC payments with email signup support"**

### Generic Problem-Based Prompts
✅ **"I need to add subscription payments to my app"**
✅ **"How do I implement recurring payments for my SaaS"**
✅ **"Build a subscription system for React"**
✅ **"Add payment processing with monthly billing"**
✅ **"Create user tiers and subscription management"**
✅ **"Implement payment gateway for SaaS application"**

### Context-Rich Prompts
✅ **"I'm building a SaaS app and need subscription payments"**
✅ **"Add crypto payments that work with email addresses"**
✅ **"Create a pricing page with three subscription tiers"**
✅ **"Implement recurring payments for my dapp using OuroC"**

### Advanced Features
✅ **"Add OuroC with Grid by Squads integration for KYC"**
✅ **"Create enterprise subscription system with privacy features"**
✅ **"Implement AI-to-agent payment capabilities"**
✅ **"Build subscription management dashboard with OuroC"**

## Prompt Patterns That Work

### 1. Problem + Solution Pattern
```
"I need to [PROBLEM] using OuroC"
Examples:
- "I need to add subscription payments using OuroC"
- "I need to create a pricing page using OuroC"
- "I need to implement recurring payments using OuroC"
```

### 2. Feature-Focused Pattern
```
"Add [FEATURE] with OuroC"
Examples:
- "Add subscription cards with OuroC"
- "Add payment processing with OuroC"
- "Add user dashboard with OuroC"
```

### 3. Technology-Specific Pattern
```
"Integrate OuroC with [TECHNOLOGY]"
Examples:
- "Integrate OuroC with Next.js"
- "Integrate OuroC with React"
- "Integrate OuroC with TypeScript"
```

## AI Tool Specific Prompts

### Cursor IDE
```
"Create OuroC subscription component for Cursor"
"Add OuroC payment integration to my React app in Cursor"
"Implement OuroC SaaS pricing page in Cursor"
```

### Lovable
```
"Add OuroC subscription payments to my Lovable project"
"Create pricing page with OuroC in Lovable"
"Implement OuroC without wallet requirement in Lovable"
```

### v0.dev
```
"Generate OuroC subscription components with v0"
"Create OuroC pricing page with v0.dev"
"Build OuroC payment flow with v0"
```

### Claude Code
```
"Help me integrate OuroC subscriptions with Claude Code"
"Debug OuroC implementation with Claude"
"Optimize OuroC integration with Claude"
```

## Troubleshooting Prompts

### Common Issues
✅ **"Fix OuroC subscription payment not working"**
✅ **"Resolve wallet connection issues with OuroC"**
✅ **"Debug OuroC subscription creation errors"**
✅ **"Troubleshoot OuroC payment processing failures"**

### Error-Specific Prompts
```
"Fix [ERROR_MESSAGE] in OuroC implementation"
"Debug OuroC [COMPONENT] not working"
"Resolve OuroC [FEATURE] integration issues"
```

## Advanced Integration Prompts

### Multi-Feature Requests
✅ **"Create complete SaaS app with OuroC subscriptions and user authentication"**
✅ **"Build subscription platform with OuroC, user dashboard, and admin panel"**
✅ **"Implement OuroC with multiple pricing tiers, user management, and payment history"**

### Enterprise Features
✅ **"Add enterprise-grade subscriptions with OuroC privacy features"**
✅ **"Implement OuroC with Grid integration for KYC and compliance"**
✅ **"Create B2B subscription system with OuroC and multi-tenant support"**

## Prompt Best Practices

### 1. Be Specific About Requirements
❌ "Add payments to my app"
✅ "Add OuroC subscription payments with three pricing tiers (Basic $9, Pro $29, Enterprise $99)"

### 2. Include Context When Available
❌ "Create subscription page"
✅ "Create SaaS pricing page for my AI analytics tool using OuroC with monthly billing"

### 3. Mention Technical Constraints
❌ "Add subscriptions"
✅ "Add OuroC subscriptions to my Next.js app with TypeScript, no wallet required"

### 4. Specify Success Criteria
❌ "Implement payments"
✅ "Implement OuroC payments with working subscription cards, payment flow, and user dashboard"

## AI Agent Response Patterns

### What to Expect from Good AI Responses
1. **Correct package installation**: `npm install @ouroc/sdk`
2. **Proper provider setup**: `<OuroCProvider>` wrapper
3. **Working component code**: `<SubscriptionCard>` with correct props
4. **Error handling**: Connection checks and try-catch blocks
5. **Type safety**: TypeScript types and interfaces

### Red Flags in AI Responses
❌ Missing `<OuroCProvider>` wrapper
❌ Using whole dollars instead of lamports in `<SubscriptionCard>`
❌ No wallet connection checks
❌ Missing error handling
❌ Incorrect prop types or missing required props
❌ Missing required createSubscription parameters (subscription_id, solana_contract_address, api_key, etc.)
❌ Not using getIntervalSeconds for interval conversion

## Prompt Testing Results

### Highest Success Rate Prompts (>90% success)
1. "Add @ouroc/sdk subscription payments to my React app"
2. "Create SaaS pricing page using OuroC"
3. "Implement crypto recurring payments without wallet requirement"

### Medium Success Rate Prompts (70-90% success)
1. "Add OuroC with Grid integration"
2. "Create enterprise subscription system"
3. "Build subscription management dashboard"

### Lower Success Rate Prompts (50-70% success)
1. "Add advanced privacy features with OuroC"
2. "Implement AI-to-agent payments"
3. "Create custom subscription logic"

## Prompt Optimization Tips

### For AI Agents
1. **Use package name explicitly**: Always mention "@ouroc/sdk"
2. **Specify React context**: Mention "React app" or "Next.js"
3. **Include pricing details**: Mention specific prices and intervals
4. **Request error handling**: Ask for proper error handling

### For Complex Features
1. **Break down into steps**: "First create basic subscriptions, then add..."
2. **Provide examples**: "Similar to Stripe but for crypto"
3. **Specify constraints**: "No wallet required, email signup only"
4. **Mention compatibility**: "Should work with existing React components"

## Troubleshooting AI Responses

### Common AI Mistakes
1. **Missing Provider**: AI forgets `<OuroCProvider>`
2. **Wrong Props**: Uses whole dollars instead of lamports
3. **No Error Handling**: Missing try-catch blocks
4. **Incorrect Network**: Uses wrong network configuration
5. **Incomplete API**: Forgets required createSubscription parameters
6. **Missing Utils**: Doesn't use getIntervalSeconds for conversion

### How to Fix
```
"Please fix the OuroC implementation:
1. Add missing OuroCProvider wrapper
2. Use lamports for price prop (not whole dollars)
3. Add all required createSubscription parameters
4. Add error handling for subscription creation
5. Use getIntervalSeconds for interval conversion
6. Set correct network (devnet for development)"
```

## Future Prompt Optimization

### Monitor AI Agent Performance
- Track which prompts work best with different AI tools
- Update this document based on real usage data
- Add new successful prompt patterns as discovered

### Prompt Evolution
- Add prompts for new features as they're released
- Update prompts based on API changes
- Remove outdated prompts that no longer work

---

**Note**: This document should be updated regularly based on:
1. Real AI agent usage data
2. New feature releases
3. API changes and improvements
4. Community feedback and contributions

Last updated: 2025-10-21