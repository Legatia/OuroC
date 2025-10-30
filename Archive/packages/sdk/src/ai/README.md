# OuroC AI Agent Integration

This directory contains AI-focused documentation and utilities to help AI coding agents (Cursor, Lovable, v0.dev, Bolt, Claude Code, etc.) successfully integrate OuroC SDK into applications.

**✅ X.402 Delegation Protocol Operational**: AI agents can now securely manage subscriptions with capability tokens and constraint-based permissions.

## 🤖 For AI Coding Agents

### Quick Access
```typescript
// AI agents can import the AI helper directly
import { getAIInstructions, getEffectivePrompts, getX402Prompts } from '@ouroc/sdk/ai';

// Get latest instructions with fallback chain
const instructions = await getAIInstructions();

// Get working prompts for AI tools
const prompts = await getEffectivePrompts();

// Get X.402 delegation specific prompts
const x402Prompts = getX402Prompts();
```

### What AI Agents Get

1. **Working Prompts**: Tested prompts that consistently work
2. **X.402 Delegation Support**: Secure AI agent authorization patterns
3. **Current API Info**: Up-to-date component and hook documentation
4. **Code Examples**: Ready-to-use implementation patterns
5. **Troubleshooting**: Common issues and solutions
6. **Best Practices**: AI-specific implementation tips
7. **Middleware Integration**: Express.js and Next.js delegation verification

## 📁 File Structure

```
packages/sdk/src/ai/
├── index.ts              # Main AI integration module with X.402 support
├── instructions.json     # NPM-published instructions
├── prompts.md           # Effective prompts for AI agents
├── utilities.ts         # AI detection and suggestion utilities
└── README.md           # This file
```

## 🔧 Three Delivery Methods

### 1. Built-in Instructions (Always Available)
```typescript
import { getBuiltinInstructions } from '@ouroc/sdk/ai';
// Always works, no network required
```

### 2. GitHub Updates (Live from Repository)
```typescript
import { fetchGitHubInstructions } from '@ouroc/sdk/ai';
// Gets latest from your GitHub repo
```

### 3. NPM Published Instructions (With Releases)
```typescript
import { fetchNPMInstructions } from '@ouroc/sdk/ai';
// Gets version-specific instructions from npm
```

## 🎯 Unified API

AI agents should use the unified API for best results:

```typescript
import { getAIInstructions } from '@ouroc/sdk/ai';

// Automatically tries GitHub → NPM → Built-in fallback
const latestInstructions = await getAIInstructions();
```

## ⚠️ Important Implementation Notes

The OuroC SDK requires **complex subscription configuration**. AI agents should note:

### Price Format
- **Required**: Prices must be in **lamports** (1 SOL = 1,000,000,000 lamports)
- **Example**: $29 USD ≈ 29,000,000 lamports (0.029 SOL)
- **Component**: `<SubscriptionCard price={29000000} />`

### Required Subscription Parameters
`createSubscription` requires these parameters:
- `subscription_id` (from your backend)
- `amount` (in lamports)
- `intervalSeconds` (use `getIntervalSeconds()`)
- `plan_name`
- `solana_contract_address` (your contract)
- `api_key` (your service API key)
- `token_mint` (USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)

### Backend Integration Required
AI agents should emphasize that **backend integration is required** for:
- Generating subscription IDs
- Providing contract addresses
- Managing API keys
- Handling subscription lifecycle

## 📋 Effective Prompts

### High Success Rate Prompts

#### Basic Subscription Prompts
- "Add @ouroc/sdk subscription payments to my React app"
- "Create a SaaS pricing page using OuroC"
- "Implement crypto recurring payments without wallet requirement"

#### X.402 Delegation Prompts (NEW)
- "Add @ouroc/sdk with X.402 delegation to my AI agent"
- "Implement secure AI agent authorization with OuroC X.402"
- "Create AI subscription management with capability tokens"
- "Build AI assistant with OuroC recurring payments"
- "Add X.402 middleware for AI authorization"

### Prompt Patterns
1. **Problem + Solution**: "I need to [PROBLEM] using OuroC"
2. **Feature-Focused**: "Add [FEATURE] with OuroC"
3. **Technology-Specific**: "Integrate OuroC with [TECHNOLOGY]"
4. **AI Delegation**: "Create AI agent with X.402 delegation for [PURPOSE]"

See [prompts.md](./prompts.md) for comprehensive prompt guide.

## 🔄 Automatic Updates

The system automatically:
- **Syncs version** with package.json on each release
- **Validates** instruction format and compatibility
- **Provides fallbacks** when external sources are unavailable
- **Logs status** for debugging AI agent issues

## 🛠️ AI Tool Compatibility

### Tested Platforms
- ✅ **Cursor** - IDE integration
- ✅ **Lovable** - Frontend development
- ✅ **v0.dev** - React component generation
- ✅ **Bolt** - AI coding assistant
- ✅ **Claude Code** - Anthropic's coding tool
- ✅ **GitHub Copilot** - Code completion

### Success Factors
- **Clear package name**: Always mention "@ouroc/sdk"
- **X.402 specification**: Include "X.402 delegation" for AI agent features
- **Specific requirements**: Include pricing, features, constraints
- **Technical context**: Mention React, Next.js, TypeScript
- **Middleware needs**: Specify Express.js or Next.js for delegation verification
- **Error handling**: Request proper error handling

## 📊 AI Agent Success Metrics

### Expected Success Rates
- **Basic prompts**: 90%+ success rate
- **Intermediate prompts**: 70-90% success rate
- **Advanced prompts**: 50-70% success rate

### Common AI Mistakes to Watch For
❌ Missing `<OuroCProvider>` wrapper
❌ Using micro-units directly in components
❌ No wallet connection checks
❌ Missing error handling
❌ Incorrect network configuration
❌ Missing X.402 capability token validation
❌ Incorrect middleware setup for delegation
❌ Capability tokens without proper constraints

## 🔍 Debugging AI Implementations

### Validation Checklist
When AI agents generate OuroC code, verify:

1. ✅ Provider wrapper present
2. ✅ Correct prop types (lamports for price, not whole dollars)
3. ✅ Wallet connection checks
4. ✅ Error handling implemented
5. ✅ Network configuration correct
6. ✅ All required createSubscription parameters included
7. ✅ getIntervalSeconds used for interval conversion
8. ✅ Backend integration requirements clearly documented
9. ✅ X.402 capability tokens properly validated
10. ✅ Delegation constraints correctly implemented
11. ✅ Middleware properly configured for API protection

### Troubleshooting Prompts
```
"Please fix the OuroC implementation:
1. Add missing OuroCProvider wrapper
2. Use lamports for price prop (not whole dollars)
3. Add all required createSubscription parameters
4. Add error handling for subscription creation
5. Use getIntervalSeconds for interval conversion
6. Set correct network (devnet for development)
7. For X.402: Add proper capability token validation
8. For AI agents: Include delegation constraints and permissions
9. For middleware: Configure Express.js/Next.js delegation verification"
```

## 📈 Performance Optimization

### For AI Agents
- **Synchronous access**: Use `getBuiltinInstructions()` for immediate results
- **Async updates**: Use `getAIInstructions()` for latest information
- **Error resilience**: System gracefully handles network failures

### For Developers
- **Bundle size**: AI module is tree-shakeable
- **Network usage**: Minimal, only when fetching updates
- **Caching**: Built-in validation and error handling

## 🚀 Future Enhancements

### Planned Features
- **Real-time validation**: Live API compatibility checking
- **Code generation**: AI-powered code templates
- **Performance metrics**: AI implementation success tracking
- **Community prompts**: Crowd-sourced effective prompts
- **X.402 delegation templates**: Pre-built capability token patterns
- **Middleware generator**: Auto-generate Express.js/Next.js delegation middleware
- **AI agent marketplace**: Discover and integrate specialized AI agents

### Contribution Guidelines
When adding new AI-focused features:
1. Test with multiple AI tools
2. Update prompt effectiveness metrics
3. Maintain backward compatibility
4. Update documentation and examples

---

**Last Updated**: 2025-10-22
**Compatibility**: OuroC SDK v1.0.0+ with X.402 Protocol v1.0+
**AI Tools Tested**: Cursor, Lovable, v0.dev, Bolt, Claude Code, GitHub Copilot
**X.402 Delegation**: ✅ Operational with middleware support